import { describe, expect, it } from "vitest";
import { createTranslator, en, pt } from "@/i18n/translator";

function getObjectKeyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      keys.push(...getObjectKeyPaths(val as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe("i18n Locales Parity and Completeness", () => {
  it("should have identical translation keys in Portuguese and English", () => {
    const ptKeys = getObjectKeyPaths(pt as unknown as Record<string, unknown>);
    const enKeys = getObjectKeyPaths(en as unknown as Record<string, unknown>);

    expect(ptKeys).toEqual(enKeys);
    expect(ptKeys.length).toBeGreaterThan(50);
  });

  it("should not have empty translation strings in Portuguese", () => {
    const ptKeys = getObjectKeyPaths(pt as unknown as Record<string, unknown>);
    for (const path of ptKeys) {
      const parts = path.split(".");
      let val: unknown = pt;
      for (const p of parts) {
        val = (val as Record<string, unknown>)[p];
      }
      expect(typeof val).toBe("string");
      expect((val as string).trim().length).toBeGreaterThan(0);
    }
  });

  it("should not have empty translation strings in English", () => {
    const enKeys = getObjectKeyPaths(en as unknown as Record<string, unknown>);
    for (const path of enKeys) {
      const parts = path.split(".");
      let val: unknown = en;
      for (const p of parts) {
        val = (val as Record<string, unknown>)[p];
      }
      expect(typeof val).toBe("string");
      expect((val as string).trim().length).toBeGreaterThan(0);
    }
  });

  it("should support parameter interpolation via createTranslator", () => {
    const tPt = createTranslator("pt");
    const tEn = createTranslator("en");

    expect(
      tPt("shareModal.emailTab.feedback.inviteSent", { email: "dev@example.com" })
    ).toBe("Convite enviado para dev@example.com!");
    expect(
      tEn("shareModal.emailTab.feedback.inviteSent", { email: "dev@example.com" })
    ).toBe("Invite sent to dev@example.com!");
  });

  it("should support count interpolation", () => {
    const tPt = createTranslator("pt");
    expect(tPt("studio.inspector.header.selectedCount", { count: 3 })).toBe(
      "3 selecionados"
    );
  });
});
