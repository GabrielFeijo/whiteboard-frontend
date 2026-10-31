import type * as awarenessProtocol from "y-protocols/awareness";
import {
  AwarenessCursor,
  AwarenessCursorSchema,
  AwarenessUser,
  AwarenessUserSchema,
  AwarenessViewport,
  AwarenessViewportSchema,
  PresenceState,
  PresenceStateSchema,
  Role,
} from "@/shared";

export {
  AwarenessCursorSchema,
  AwarenessUserSchema,
  AwarenessViewportSchema,
  PresenceStateSchema as CollaboratorAwarenessStateSchema,
};
export type {
  AwarenessCursor,
  AwarenessUser,
  AwarenessViewport,
  PresenceState as CollaboratorAwarenessState,
};

export interface ParsedCollaborator {
  clientId: number;
  user: {
    id: string;
    name: string;
    email?: string;
    color: string;
    role: Role;
  };
  cursor: AwarenessCursor | null;
  viewport?: AwarenessViewport;
}

export function parseAwarenessStates(
  awareness: awarenessProtocol.Awareness,
): ParsedCollaborator[] {
  const states = awareness.getStates();
  const collaborators: ParsedCollaborator[] = [];

  states.forEach((rawState, clientId) => {
    const parsed = PresenceStateSchema.safeParse(rawState);
    if (!parsed.success || !parsed.data.user) {
      return;
    }

    collaborators.push({
      clientId,
      user: parsed.data.user,
      cursor: parsed.data.cursor ?? null,
      viewport: parsed.data.viewport,
    });
  });

  return collaborators;
}

export function getCollaboratorStateByClientId(
  awareness: awarenessProtocol.Awareness,
  clientId: number,
): PresenceState | null {
  const rawState = awareness.getStates().get(clientId);
  if (!rawState) return null;
  const parsed = PresenceStateSchema.safeParse(rawState);
  return parsed.success ? parsed.data : null;
}

export function setLocalUserAwareness(
  awareness: awarenessProtocol.Awareness,
  user: AwarenessUser,
): void {
  awareness.setLocalStateField("user", user);
}

export function setLocalCursorAwareness(
  awareness: awarenessProtocol.Awareness,
  cursor: AwarenessCursor | null,
): void {
  awareness.setLocalStateField("cursor", cursor);
}

export function setLocalViewportAwareness(
  awareness: awarenessProtocol.Awareness,
  viewport: AwarenessViewport,
): void {
  awareness.setLocalStateField("viewport", viewport);
}
