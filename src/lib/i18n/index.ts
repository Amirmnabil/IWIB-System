
import { en } from './en';
import { ar } from './ar';
import { Language, TranslationSchema } from './types';

export const translations: Record<Language, TranslationSchema> = {
  en,
  ar,
};

/**
 * Advanced Translation Hook/Function
 * Features:
 * 1. Type-safe keys
 * 2. Fallback to English if key is missing in another language
 * 3. Fallback to key name if missing everywhere
 * 4. Development warnings for missing keys
 * 5. Placeholder support {name}, {number}, etc.
 */
export const t = (
  key: keyof TranslationSchema,
  lang: Language = 'en',
  placeholders?: Record<string, string | number>
): string => {
  let translation: string | undefined = translations[lang][key] || translations['en'][key];

  if (!translation) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Missing translation for key: "${key}" in language: "${lang}"`);
    }
    return String(key);
  }

  // Use a standard for...of loop to maintain type narrowing for 'translation'
  if (placeholders) {
    for (const [name, value] of Object.entries(placeholders)) {
      translation = translation.replace(`{${name}}`, String(value));
    }
  }

  return translation;
};

export * from './types';
