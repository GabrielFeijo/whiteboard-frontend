import { describe, expect, it } from "vitest";
import { createTranslator, en, pt, isValidLocale } from "@/i18n/translator";
import { parseAcceptLanguage } from "@/i18n/server";
import { isValidTheme } from "@/server/preferences";

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

  it("parses accept-language headers and handles quality weights properly", () => {
    expect(parseAcceptLanguage(undefined)).toBe("pt");
    expect(parseAcceptLanguage(null)).toBe("pt");
    expect(parseAcceptLanguage("")).toBe("pt");
    expect(parseAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(parseAcceptLanguage("pt-BR,pt;q=0.9,en-US;q=0.8")).toBe("pt");
    expect(parseAcceptLanguage("en-US;q=0.5,pt-BR;q=0.9")).toBe("pt");
    expect(parseAcceptLanguage("pt-BR;q=0.4,en;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("es-ES,es;q=0.9,de;q=0.8")).toBe("pt");
  });

  it("validates locale and theme inputs correctly", () => {
    expect(isValidLocale("pt")).toBe(true);
    expect(isValidLocale("en")).toBe(true);
    expect(isValidLocale("fr")).toBe(false);
    expect(isValidLocale(null)).toBe(false);

    expect(isValidTheme("light")).toBe(true);
    expect(isValidTheme("dark")).toBe(true);
    expect(isValidTheme("system")).toBe(true);
    expect(isValidTheme("neon")).toBe(false);
    expect(isValidTheme(undefined)).toBe(false);
  });
});
