import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { IndexeddbPersistence } from "y-indexeddb";
import { api, WS_URL } from "../lib/api/client";
import { MSG, WS_CLOSE, Role } from "../shared";

export type ConnectionStatus =
  "connecting" | "connected" | "syncing" | "synced" | "offline" | "forbidden";

export class SyncProvider {
  readonly doc: Y.Doc;
  readonly awareness: awarenessProtocol.Awareness;
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 1000;
  private isDestroyed = false;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  status: ConnectionStatus = "connecting";
  role: Role = "VIEWER";
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
      if (origin !== this && this.ws?.readyState === WebSocket.OPEN && this.role !== "VIEWER") {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG.SYNC);
        syncProtocol.writeUpdate(encoder, update);
        this.ws.send(encoding.toUint8Array(encoder));
      }
    });

    this.awareness.on(
      "update",
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        if (origin !== this && this.ws?.readyState === WebSocket.OPEN) {
          const changedClients = added.concat(updated).concat(removed);
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG.AWARENESS);
          encoding.writeVarUint8Array(
            encoder,
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
          );
          this.ws.send(encoding.toUint8Array(encoder));
        }
      },
    );
  }

  onStatusChange(cb: (status: ConnectionStatus) => void) {
    this.listeners.add(cb);
    cb(this.status);
    return () => this.listeners.delete(cb);
  }

  private setStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.listeners.forEach((cb) => cb(newStatus));
  }

  private async connect() {
    if (this.isDestroyed) return;
    this.setStatus("connecting");

    try {
      const res = await api.post<{ ticket: string; role: Role }>(
        `/boards/${this.boardId}/ws-ticket`,
        { token: this.shareToken },
      );
      this.role = res.data.role;

      const url = `${WS_URL}?ticket=${res.data.ticket}`;
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      this.ws = ws;

      ws.onopen = () => {
        this.reconnectDelay = 1000;
        this.setStatus("syncing");

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
            awarenessProtocol.encodeAwarenessUpdate(this.awareness, Array.from(states.keys())),
          );
          ws.send(encoding.toUint8Array(awEncoder));
        }
      };

      ws.onmessage = (event) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        const decoder = decoding.createDecoder(data);
        const messageType = decoding.readVarUint(decoder);

        if (messageType === MSG.SYNC) {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG.SYNC);
          syncProtocol.readSyncMessage(decoder, encoder, this.doc, this);
          if (encoding.length(encoder) > 1 && ws.readyState === WebSocket.OPEN) {
            ws.send(encoding.toUint8Array(encoder));
          }
          if (this.status === "syncing") {
            this.setStatus("synced");
          }
        } else if (messageType === MSG.AWARENESS) {
          awarenessProtocol.applyAwarenessUpdate(
            this.awareness,
            decoding.readVarUint8Array(decoder),
            this,
          );
        }
      };

      ws.onclose = (event) => {
        if (event.code === WS_CLOSE.FORBIDDEN) {
          this.setStatus("forbidden");
          return;
        }
        this.setStatus("offline");
        this.scheduleReconnect();
      };

      ws.onerror = () => {
        this.setStatus("offline");
        ws.close();
      };
    } catch {
      this.setStatus("offline");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed || this.reconnectTimeout) return;
    const jitter = Math.random() * 1000;
    const delay = Math.min(this.reconnectDelay + jitter, 30_000);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.listeners.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.indexeddbProvider) {
      this.indexeddbProvider.destroy();
    }
    this.awareness.destroy();
    this.doc.destroy();
  }
}
