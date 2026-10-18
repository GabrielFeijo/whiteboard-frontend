import * as Y from 'yjs';
import { z } from 'zod';

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

const finite = z.number().finite();

export const ElementStyleSchema = z.object({
  fill: z.string().max(32),
  stroke: z.string().max(32),
  strokeWidth: finite.min(0).max(100),
  opacity: finite.min(0).max(1),
});

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

export const ArrowBindingSchema = z.object({
  elementId: z.string().max(64),
  anchor: AnchorPointSchema,
});
export type ArrowBinding = z.infer<typeof ArrowBindingSchema>;

export const ElementDataSchema = z.object({
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
  src: z.string().max(2_000_000).optional(),
});
export type ElementData = z.infer<typeof ElementDataSchema>;

export const PresenceStateSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string().max(100),
    color: z.string().max(32),
    avatar: z.string().max(500).optional(),
  }),
  cursor: z.object({ x: finite, y: finite }).nullable(),
  selection: z.array(z.string().max(64)).max(5000),
  draft: z.object({ type: z.literal(ElementType.FREEHAND), points: z.array(finite) }).optional(),
  viewport: z.object({ x: finite, y: finite, zoom: finite }).optional(),
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

