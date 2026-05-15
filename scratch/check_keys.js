import fs from 'fs';
import path from 'path';

const translationsPath = 'd:/IWIB/IWIB System/SYSTEM/src/lib/translations.ts';
const settingsPath = 'd:/IWIB/IWIB System/SYSTEM/src/app/(app)/settings/page.tsx';

function getTranslationKeys() {
    const content = fs.readFileSync(translationsPath, 'utf8');
    const enMatch = content.match(/en: \{([\s\S]*?)\},/);
    if (!enMatch) return [];
    const keys = enMatch[1].split('\n')
        .map(line => line.trim().split(':')[0])
        .filter(key => key && !key.startsWith('//'));
    return keys;
}

function getUsedKeys() {
    const content = fs.readFileSync(settingsPath, 'utf8');
    const matches = content.matchAll(/t\(['"](.*?)['"]\)/g);
    const keys = new Set();
    for (const match of matches) {
        keys.add(match[1]);
    }
    return Array.from(keys);
}

const registryKeys = getTranslationKeys();
const usedKeys = getUsedKeys();

const missing = usedKeys.filter(k => !registryKeys.includes(k));

console.log('Missing Keys:', missing);
