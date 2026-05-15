import fs from 'fs';

const content = fs.readFileSync('d:\\IWIB\\IWIB System\\SYSTEM\\src\\lib\\translations.ts', 'utf8');

function findDuplicates(objStr) {
    const lines = objStr.split('\n');
    const keys = [];
    const duplicates = [];
    for (let line of lines) {
        const match = line.match(/^\s*([a-zA-Z0-9_-]+):/);
        if (match) {
            const key = match[1];
            if (keys.includes(key)) {
                duplicates.push(key);
            }
            keys.push(key);
        }
    }
    return duplicates;
}

const enMatch = content.match(/en: \{([\s\S]*?)\n  \},/);
const arMatch = content.match(/ar: \{([\s\S]*?)\n  \}/);

if (enMatch) {
    console.log('EN Duplicates:', findDuplicates(enMatch[1]));
}
if (arMatch) {
    console.log('AR Duplicates:', findDuplicates(arMatch[1]));
}
