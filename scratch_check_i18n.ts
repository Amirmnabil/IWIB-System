import { en } from './src/lib/i18n/en';
import { ar } from './src/lib/i18n/ar';

const enKeys = Object.keys(en);
const arKeys = Object.keys(ar);

const missingInAr = enKeys.filter(k => !(k in ar));
const missingInEn = arKeys.filter(k => !(k in en));

console.log('Missing in ar.ts:', missingInAr);
console.log('Missing in en.ts:', missingInEn);

// Also maybe some missing in TranslationSchema? We can't easily reflect interfaces at runtime without a transformer, 
// but we can check the keys of `en` vs `ar` first.
