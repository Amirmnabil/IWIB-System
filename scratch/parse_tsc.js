const fs = require('fs');
const content = fs.readFileSync('tsc_output.txt', 'utf16le');
const matches = content.match(/Argument of type '\"([^\"]+)\"'/g);
const uniqueKeys = Array.from(new Set(matches ? matches.map(m => m.replace(/Argument of type '\"|\"'/g, '')) : []));
console.log(uniqueKeys.join('\n'));
