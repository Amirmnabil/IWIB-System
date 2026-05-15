import { en } from './en';
import { ar } from './ar';
import { Language, TranslationSchema } from '@/types/i18n';

export const translations: Record<Language, TranslationSchema> = {
  en: en as TranslationSchema,
  ar: ar as TranslationSchema,
};

/**
 * Strongly Typed Translation Function
 */
export function t<K extends keyof TranslationSchema>(
  key: K,
  lang: Language = 'en',
  placeholders?: Record<string, string | number>
): string {
  let translation: string | undefined = translations[lang][key] || translations['en'][key];

  if (!translation) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing translation for key: "${key}" in language: "${lang}"`);
    }
    return String(key);
  }

  if (placeholders) {
    for (const [name, value] of Object.entries(placeholders)) {
      translation = translation.replace(`{${name}}`, String(value));
    }
  }

  return translation;
}

export type { Language, TranslationSchema };
