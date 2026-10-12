import * as Y from 'yjs';
import { z } from 'zod';

/** Modelo de dados do documento CRDT. Doc §6.1. */
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
  z: z.string().min(1).max(64), // chave de fractional indexing
  style: ElementStyleSchema,
  text: z.string().max(10_000).optional(), // Y.Text no documento vivo
  points: z.array(finite).max(20_000).optional(), // [x0,y0,p0,x1,y1,p1,...]
  parentId: z.string().max(64).optional(),
  assetId: z.string().max(64).optional(),
  createdBy: z.string().min(1).max(64),
});
export type ElementData = z.infer<typeof ElementDataSchema>;

/** Estado de presença (awareness). Doc §8.1. Efêmero; não persiste. */
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

/** Raízes compartilhadas do Y.Doc. */
export function getDocRoots(doc: Y.Doc) {
  return {
    elements: doc.getMap<Y.Map<unknown>>('elements'), // id -> Y.Map
    meta: doc.getMap('meta'), // schemaVersion, nome
    comments: doc.getArray('comments'),
  };
}
