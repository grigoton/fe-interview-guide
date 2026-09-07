/**
 * A piece of text available in both supported locales.
 * The active locale is resolved at render time via `LocaleService`.
 */
export interface LocalizedText {
  ru: string;
  en: string;
}
