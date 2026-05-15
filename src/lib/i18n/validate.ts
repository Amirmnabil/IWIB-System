
import { en } from './en';
import { ar } from './ar';
import { TranslationSchema } from '@/types/i18n';

/**
 * Validates that all keys in TranslationSchema are present in both languages.
 * This can be called at runtime in development or during build.
 */
export function validateTranslations() {
  const enKeys = Object.keys(en) as (keyof TranslationSchema)[];
  const arKeys = Object.keys(ar) as (keyof TranslationSchema)[];
  
  const missingInAr = enKeys.filter(key => !arKeys.includes(key));
  const missingInEn = arKeys.filter(key => !enKeys.includes(key));
  
  const errors: string[] = [];
  
  if (missingInAr.length > 0) {
    errors.push(`Missing in Arabic: ${missingInAr.join(', ')}`);
  }
  
  if (missingInEn.length > 0) {
    errors.push(`Missing in English: ${missingInEn.join(', ')}`);
  }
  
  if (errors.length > 0) {
    console.error(`[i18n Validation Failed]\n${errors.join('\n')}`);
    return false;
  }
  
  console.log('[i18n Validation Passed] All keys synchronized.');
  return true;
}
