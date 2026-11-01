import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { IndexeddbPersistence } from "y-indexeddb";
import { api, WS_URL } from "@/lib/api/client";
import { MSG, WS_CLOSE, Role } from "@/shared";

export const ConnectionStatus = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  SYNCING: "syncing",
  SYNCED: "synced",
  OFFLINE: "offline",
  FORBIDDEN: "forbidden",
} as const;

export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

export type SyncStatus = ConnectionStatus;
export const SyncStatus = ConnectionStatus;

export class SyncProvider {
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private isDestroyed = false;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  private pendingUpdates: Uint8Array[] = [];
  private rafHandle: number | ReturnType<typeof setTimeout> | null = null;
  status: ConnectionStatus = ConnectionStatus.CONNECTING;
  role: Role = Role.VIEWER;
  private listeners = new Set<(status: ConnectionStatus) => void>();

  constructor(
    readonly boardId: string,
    readonly shareToken?: string,
  ) {
    this.doc = new Y.Doc();
    this.awareness = new awarenessProtocol.Awareness(this.doc);

    if (typeof window !== "undefined") {
      this.indexeddbProvider = new IndexeddbPersistence(`wb-${boardId}`, this.doc);
    }

    this.connect();

    this.doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (
        origin !== this &&
        this.ws?.readyState === WebSocket.OPEN &&
        this.role !== Role.VIEWER
      ) {
        this.pendingUpdates.push(update);
        this.scheduleFlush();
      }
    });

    this.awareness.on(
      "update",
      (
        {
          added,
          updated,
          removed,
        }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (origin !== this && this.ws?.readyState === WebSocket.OPEN) {
          const changedClients = added.concat(updated).concat(removed);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG.AWARENESS);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(
              this.awareness,
              changedClients,
            ),
          );
          this.ws.send(encoding.toUint8Array(encoder));
        }
      },
    );
  }

  onStatusChange(cb: (status: ConnectionStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => this.listeners.delete(cb);
  }

  private setStatus(newStatus: ConnectionStatus): void {
    this.status = newStatus;
    this.listeners.forEach((cb) => cb(newStatus));
  }

  private async connect(): Promise<void> {
    if (this.isDestroyed) return;
    this.setStatus(ConnectionStatus.CONNECTING);

    try {
      const res = await api.post<{ ticket: string; role: Role }>(
        `/boards/${this.boardId}/ws-ticket`,
        { token: this.shareToken },
      );
      this.role = res.data.role;

      const url = `${WS_URL}?ticket=${encodeURIComponent(res.data.ticket)}`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectDelay = 1000;
        this.setStatus(ConnectionStatus.SYNCING);

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG.SYNC);
        syncProtocol.writeSyncStep1(encoder, this.doc);
        ws.send(encoding.toUint8Array(encoder));

        const states = this.awareness.getStates();
        if (states.size > 0) {
          const awEncoder = encoding.createEncoder();
          encoding.writeVarUint(awEncoder, MSG.AWARENESS);
          encoding.writeVarUint8Array(
            awEncoder,
            awarenessProtocol.encodeAwarenessUpdate(
              this.awareness,
              Array.from(states.keys()),
            ),
          );
          ws.send(encoding.toUint8Array(awEncoder));
        }
      };

      ws.onmessage = (event: MessageEvent<unknown>) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        const data = new Uint8Array(event.data);
        const decoder = decoding.createDecoder(data);
        const messageType = decoding.readVarUint(decoder);

        if (messageType === MSG.SYNC) {
          this.handleSyncMessage(decoder, ws);
          return;
        }

        if (messageType === MSG.AWARENESS) {
          this.handleAwarenessMessage(decoder);
        }
      };

      ws.onclose = (event) => {
        if (event.code === WS_CLOSE.FORBIDDEN) {
          this.setStatus(ConnectionStatus.FORBIDDEN);
          return;
        }
        this.setStatus(ConnectionStatus.OFFLINE);
        this.scheduleReconnect();
      };

      ws.onerror = () => {
        this.setStatus(ConnectionStatus.OFFLINE);
        ws.close();
      };
    } catch {
      this.setStatus(ConnectionStatus.OFFLINE);
      this.scheduleReconnect();
    }
  }

  private handleSyncMessage(decoder: decoding.Decoder, ws: WebSocket): void {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG.SYNC);
    syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
    if (encoding.length(encoder) > 1 && ws.readyState === WebSocket.OPEN) {
      ws.send(encoding.toUint8Array(encoder));
    }
    if (this.status === ConnectionStatus.SYNCING) {
      this.setStatus(ConnectionStatus.SYNCED);
    }
  }

  private handleAwarenessMessage(decoder: decoding.Decoder): void {
    awarenessProtocol.applyAwarenessUpdate(
      this.awareness,
      decoding.readVarUint8Array(decoder),
      this,
    );
  }

  private cancelScheduledFlush(): void {
    if (this.rafHandle === null) return;
    if (typeof cancelAnimationFrame === "function" && typeof this.rafHandle === "number") {
      cancelAnimationFrame(this.rafHandle);
    } else {
      clearTimeout(this.rafHandle);
    }
    this.rafHandle = null;
  }

  private teardownWebSocket(): void {
    if (!this.ws) return;
    const canNotifyAwareness =
      this.ws.readyState === WebSocket.OPEN &&
      this.awareness.getLocalState() !== null;
    if (canNotifyAwareness) {
      awarenessProtocol.removeAwarenessStates(
        this.awareness,
        [this.doc.clientID],
        "destroy",
      );
    }
    this.ws.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed || this.reconnectTimeout) return;
    const jitter = Math.random() * 1000;
    const delay = Math.min(this.reconnectDelay + jitter, 30_000);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private scheduleFlush(): void {
    if (this.rafHandle !== null) return;

    if (typeof requestAnimationFrame === "function") {
      this.rafHandle = requestAnimationFrame(() => {
        this.rafHandle = null;
        this.flush();
      });
    } else {
      this.rafHandle = setTimeout(() => {
        this.rafHandle = null;
        this.flush();
      }, 16);
    }
  }

  flush(): void {
    this.cancelScheduledFlush();

    if (this.pendingUpdates.length === 0) return;
    if (this.ws?.readyState !== WebSocket.OPEN || this.role === Role.VIEWER) {
      this.pendingUpdates = [];
      return;
    }

    const updatesToSend = this.pendingUpdates;
    this.pendingUpdates = [];

    const merged =
      updatesToSend.length === 1
        ? updatesToSend[0]!
        : Y.mergeUpdates(updatesToSend);

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG.SYNC);
    syncProtocol.writeUpdate(encoder, merged);
    this.ws.send(encoding.toUint8Array(encoder));
  }

  destroy(): void {
    this.isDestroyed = true;
    this.cancelScheduledFlush();
    this.flush();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.listeners.clear();
    this.teardownWebSocket();
    if (this.indexeddbProvider) {
      this.indexeddbProvider.destroy();
    }
    this.awareness.destroy();
    this.doc.destroy();
  }
}
