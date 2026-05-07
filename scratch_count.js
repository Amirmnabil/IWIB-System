const fs = require('fs');

const data = fs.readFileSync('src/lib/plans-data.ts', 'utf8');

// A simple regex to count occurrences of `"company": "XYZ"`
const matches = data.match(/"company":\s*"(.*?)"/g);
if (matches) {
  const counts = {};
  matches.forEach(m => {
    const name = m.split(':')[1].replace(/"/g, '').trim();
    counts[name] = (counts[name] || 0) + 1;
  });
  console.log('Total:', matches.length);
  console.log(counts);
} else {
  console.log('No matches found');
}
