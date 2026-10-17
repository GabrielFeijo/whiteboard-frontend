import ptJson from "./locales/pt.json";

export type Locale = "pt" | "en";

export type Translations = typeof ptJson;

type LeafKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & string]: ObjectType[Key] extends Record<string, unknown>
    ? `${Key}.${LeafKeyOf<ObjectType[Key]>}`
    : Key;
}[keyof ObjectType & string];

export type TranslationKey = LeafKeyOf<Translations>;
