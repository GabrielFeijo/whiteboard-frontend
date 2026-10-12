import { describe, it, expect } from "vitest";
import { pt, en } from "../../src/i18n";

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

  it("should support parameter interpolation", () => {
    const template = pt.shareModal.title;
    expect(template).toContain("{title}");
    const replaced = template.replace("{title}", "Sprint Planning");
    expect(replaced).toBe('Compartilhar "Sprint Planning"');
  });

  it("should support count interpolation", () => {
    const template = pt.properties.selectedCount;
    expect(template).toContain("{count}");
    const replaced = template.replace("{count}", "3");
    expect(replaced).toBe("3 selecionados");
  });
});
