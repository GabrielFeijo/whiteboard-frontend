import * as Y from 'yjs';
import { z } from 'zod';
import { ROLES, Role } from './protocol';

export const ElementType = {
  RECT: 'rect',
  ELLIPSE: 'ellipse',
  DIAMOND: 'diamond',
  LINE: 'line',
  ARROW: 'arrow',
  TEXT: 'text',
  STICKY: 'sticky',
  FREEHAND: 'freehand',
  IMAGE: 'image',
  GROUP: 'group',
} as const;
export const ELEMENT_TYPES = [
  ElementType.RECT,
  ElementType.ELLIPSE,
  ElementType.DIAMOND,
  ElementType.LINE,
  ElementType.ARROW,
  ElementType.TEXT,
  ElementType.STICKY,
  ElementType.FREEHAND,
  ElementType.IMAGE,
  ElementType.GROUP,
] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

const finite = z.number();

export const ElementStyleSchema = z
  .object({
    fill: z.string().max(32),
    stroke: z.string().max(32),
    strokeWidth: finite.min(0).max(100),
    opacity: finite.min(0).max(1),
  })
  .strict();

export const AnchorPoint = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
} as const;
export const ANCHOR_POINTS = [
  AnchorPoint.TOP,
  AnchorPoint.BOTTOM,
  AnchorPoint.LEFT,
  AnchorPoint.RIGHT,
] as const;
export const AnchorPointSchema = z.enum(ANCHOR_POINTS);
export type AnchorPoint = (typeof ANCHOR_POINTS)[number];

export const ArrowBindingSchema = z
  .object({
    elementId: z.string().max(64),
    anchor: AnchorPointSchema,
  })
  .strict();
export type ArrowBinding = z.infer<typeof ArrowBindingSchema>;

export const ElementDataSchema = z
  .object({
    id: z.string().min(1).max(64),
    type: z.enum(ELEMENT_TYPES),
    x: finite.min(-1e7).max(1e7),
    y: finite.min(-1e7).max(1e7),
    w: finite.min(0).max(1e5),
    h: finite.min(0).max(1e5),
    rotation: finite,
    z: z.string().min(1).max(64),
    style: ElementStyleSchema,
    text: z.string().max(10_000).optional(),
    points: z.array(finite).max(20_000).optional(),
    parentId: z.string().max(64).optional(),
    assetId: z.string().max(64).optional(),
    createdBy: z.string().min(1).max(64),
    groupId: z.string().max(64).optional(),
    locked: z.boolean().optional(),
    startBinding: ArrowBindingSchema.optional(),
    endBinding: ArrowBindingSchema.optional(),
    src: z
      .string()
      .max(2048)
      .refine((val) => !val.trim().toLowerCase().startsWith('data:'), {
        message: 'Inline data URLs are prohibited in CRDT state',
      })
      .optional(),
  })
  .strict();
export type ElementData = z.infer<typeof ElementDataSchema>;

export const AwarenessUserSchema = z.object({
  id: z.string().max(64).default('unknown'),
  name: z.string().max(100),
  email: z.string().max(255).optional(),
  color: z.string().max(32),
  avatar: z.string().max(500).optional(),
  role: z.enum(ROLES).default(Role.VIEWER),
});
export type AwarenessUser = z.infer<typeof AwarenessUserSchema>;

export const AwarenessCursorSchema = z.object({
  x: finite,
  y: finite,
});
export type AwarenessCursor = z.infer<typeof AwarenessCursorSchema>;

export const AwarenessViewportSchema = z.object({
  pan: z.object({
    x: finite,
    y: finite,
  }),
  zoom: finite,
});
export type AwarenessViewport = z.infer<typeof AwarenessViewportSchema>;

export const PresenceStateSchema = z.object({
  user: AwarenessUserSchema.optional(),
  cursor: AwarenessCursorSchema.nullable().optional(),
  selection: z.array(z.string().max(64)).max(5000).optional(),
  draft: z
    .object({
      type: z.literal(ElementType.FREEHAND),
      points: z.array(finite).max(20_000),
    })
    .optional(),
  viewport: AwarenessViewportSchema.optional(),
});
export type PresenceState = z.infer<typeof PresenceStateSchema>;

export function getDocRoots(doc: Y.Doc) {
  return {
    elements: doc.getMap<Y.Map<unknown>>('elements'),
    meta: doc.getMap('meta'),
    comments: doc.getArray('comments'),
  };
}

export function isStructuralElement(el: { type: ElementType }): boolean {
  return (
    el.type !== ElementType.ARROW &&
    el.type !== ElementType.LINE &&
    el.type !== ElementType.FREEHAND
  );
}

