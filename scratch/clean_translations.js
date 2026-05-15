import fs from 'fs';

const filePath = 'd:\\IWIB\\IWIB System\\SYSTEM\\src\\lib\\translations.ts';
const content = fs.readFileSync(filePath, 'utf8');

function cleanObject(objStr) {
    const lines = objStr.split('\n');
    const seenKeys = new Set();
    const resultLines = [];
    
    for (let line of lines) {
        const match = line.match(/^\s*([a-zA-Z0-9_-]+):/);
        if (match) {
            const key = match[1];
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                resultLines.push(line);
            } else {
                // Duplicate found, skip it
                console.log('Removing duplicate:', key);
            }
        } else {
            resultLines.push(line);
        }
    }
    return resultLines.join('\n');
}

const enMatch = content.match(/(en: \{)([\s\S]*?)(\n  \},)/);
const arMatch = content.match(/(ar: \{)([\s\S]*?)(\n  \})/);

let newContent = content;

if (enMatch) {
    const cleanedEn = cleanObject(enMatch[2]);
    newContent = newContent.replace(enMatch[2], cleanedEn);
}

if (arMatch) {
    const cleanedAr = cleanObject(arMatch[2]);
    newContent = newContent.replace(arMatch[2], cleanedAr);
}

fs.writeFileSync(filePath, newContent);
console.log('Cleanup complete.');
