/** The locales the UI can be switched to. */
export type Locale = 'ru' | 'en';

/**
 * A piece of text available in the supported locales.
 *
 * Russian is the source language and is always present; `en` is optional
 * because parts of the knowledge base are authored in Russian first. Read it
 * through {@link localized} so a missing translation falls back to `ru`
 * instead of rendering nothing.
 */
export interface LocalizedText {
  ru: string;
  /** English version; when absent, consumers fall back to {@link LocalizedText.ru}. */
  en?: string;
}

/** The text in `locale`, falling back to Russian when there is no translation. */
export function localized(text: LocalizedText, locale: Locale): string {
  return (locale === 'en' ? text.en : text.ru) || text.ru;
}
