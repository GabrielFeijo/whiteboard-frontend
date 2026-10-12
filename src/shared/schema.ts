import * as Y from 'yjs';
import { z } from 'zod';

export const ELEMENT_TYPES = [
  'rect',
  'ellipse',
  'diamond',
  'line',
  'arrow',
  'text',
  'sticky',
  'freehand',
  'image',
  'group',
] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

const finite = z.number().finite();

export const ElementStyleSchema = z.object({
  fill: z.string().max(32),
  stroke: z.string().max(32),
  strokeWidth: finite.min(0).max(100),
  opacity: finite.min(0).max(1),
});

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
  draft: z.object({ type: z.literal('freehand'), points: z.array(finite) }).optional(),
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
