import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import {
  ElementDataSchema,
  LIMITS,
  MSG,
  PROTOCOL_VERSION,
  SCHEMA_VERSION,
  SHARED_VERSION,
  WS_CLOSE,
  getDocRoots,
} from "../../src/shared";

const dir = join(__dirname, "..", "..", "fixtures", "protocol");
const load = <T>(name: string) => JSON.parse(readFileSync(join(dir, name), "utf8")) as T;
const fromB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));

describe("contrato do protocolo (shared)", () => {
  it("constantes batem com fixtures/protocol/constants.json", () => {
    const c = load<Record<string, unknown>>("constants.json");
    expect(c.SHARED_VERSION).toBe(SHARED_VERSION);
    expect(c.SCHEMA_VERSION).toBe(SCHEMA_VERSION);
    expect(c.PROTOCOL_VERSION).toBe(PROTOCOL_VERSION);
    expect(c.MSG).toEqual(MSG);
    expect(c.WS_CLOSE).toEqual(WS_CLOSE);
    expect(c.LIMITS).toEqual(LIMITS);
  });

  it("doc-basic: aplicar o update reproduz o estado esperado e respeita o schema", () => {
    const f = load<{ updates: string[]; expected: Record<string, unknown> }>("doc-basic.json");
    const d = new Y.Doc();
    f.updates.forEach((u) => Y.applyUpdate(d, fromB64(u)));
    const elements = getDocRoots(d).elements.toJSON();
    expect(elements).toEqual(f.expected);
    Object.values(elements).forEach((el) =>
      expect(ElementDataSchema.safeParse(el).success).toBe(true),
    );
  });

  it("doc-concurrent: converge independentemente da ordem dos updates", () => {
    const f = load<{ base: string; updatesAnyOrder: string[]; expected: Record<string, unknown> }>(
      "doc-concurrent.json",
    );
    for (const order of [f.updatesAnyOrder, [...f.updatesAnyOrder].reverse()]) {
      const d = new Y.Doc();
      Y.applyUpdate(d, fromB64(f.base));
      order.forEach((u) => Y.applyUpdate(d, fromB64(u)));
      expect(getDocRoots(d).elements.toJSON()).toEqual(f.expected);
    }
  });

  it("schema rejeita valores inválidos (NaN, tipo desconhecido)", () => {
    const valid = {
      id: "a",
      type: "rect",
      x: 0,
      y: 0,
      w: 1,
      h: 1,
      rotation: 0,
      z: "a0",
      style: { fill: "#fff", stroke: "#000", strokeWidth: 1, opacity: 1 },
      createdBy: "u",
    };
    expect(ElementDataSchema.safeParse(valid).success).toBe(true);
    expect(ElementDataSchema.safeParse({ ...valid, x: NaN }).success).toBe(false);
    expect(ElementDataSchema.safeParse({ ...valid, type: "nope" }).success).toBe(false);
  });
});
