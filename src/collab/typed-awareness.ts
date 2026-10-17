import { z } from "zod";
import type * as awarenessProtocol from "y-protocols/awareness";
import { ROLES, Role } from "@/shared";

const finiteNumber = z.number().finite();

export const AwarenessUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
  color: z.string(),
  role: z.enum(ROLES).default(Role.VIEWER),
});

export type AwarenessUser = z.infer<typeof AwarenessUserSchema>;

export const AwarenessCursorSchema = z.object({
  x: finiteNumber,
  y: finiteNumber,
});

export type AwarenessCursor = z.infer<typeof AwarenessCursorSchema>;

export const AwarenessViewportSchema = z.object({
  pan: z.object({
    x: finiteNumber,
    y: finiteNumber,
  }),
  zoom: finiteNumber,
});

export type AwarenessViewport = z.infer<typeof AwarenessViewportSchema>;

export const CollaboratorAwarenessStateSchema = z.object({
  user: AwarenessUserSchema.optional(),
  cursor: AwarenessCursorSchema.nullable().optional(),
  viewport: AwarenessViewportSchema.optional(),
});

export type CollaboratorAwarenessState = z.infer<
  typeof CollaboratorAwarenessStateSchema
>;

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
    const parsed = CollaboratorAwarenessStateSchema.safeParse(rawState);
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
): CollaboratorAwarenessState | null {
  const rawState = awareness.getStates().get(clientId);
  if (!rawState) return null;
  const parsed = CollaboratorAwarenessStateSchema.safeParse(rawState);
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
