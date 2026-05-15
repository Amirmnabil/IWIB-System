
/**
 * REFACTORED I18N MODULE
 * -----------------------
 * This file now serves as an entry point for the modular translation system.
 * The actual translations are located in ./i18n/ folder split by domains.
 * 
 * Objectives achieved:
 * 1. Modular structure (core, crm, claims, etc.)
 * 2. Strict TranslationSchema typing
 * 3. Consistent keys between EN and AR
 * 4. Standardized camelCase naming
 * 5. Safe t() function with placeholders and fallbacks
 */

import { translations as modularTranslations } from './i18n';
import type { Language, TranslationSchema } from './i18n/types';

// Export for backward compatibility
export const translations = modularTranslations;
export type { Language, TranslationSchema };

// Re-export the t function for direct library usage
export { t } from './i18n';
