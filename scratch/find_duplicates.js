
const fs = require('fs');
const content = fs.readFileSync('d:\\IWIB\\IWIB System\\SYSTEM\\src\\lib\\translations.ts', 'utf8');

const findDuplicates = (section) => {
    const lines = section.split('\n');
    const keys = {};
    const duplicates = [];
    lines.forEach((line, index) => {
        const match = line.match(/^\s*(\w+):/);
        if (match) {
            const key = match[1];
            if (keys[key]) {
                duplicates.push({ key, line: index + 1 });
            }
            keys[key] = true;
        }
    });
    return duplicates;
};

const enSectionMatch = content.match(/en: \{([\s\S]*?)\n  \},/);
if (enSectionMatch) {
    console.log('EN Duplicates:');
    console.log(findDuplicates(enSectionMatch[1]));
}

const arSectionMatch = content.match(/ar: \{([\s\S]*?)\n  \}/);
if (arSectionMatch) {
    console.log('AR Duplicates:');
    console.log(findDuplicates(arSectionMatch[1]));
}
