const fs = require('fs');
let code = fs.readFileSync('src/app/(app)/settings/page.tsx', 'utf8');

// Function to find the end of a block based on balanced braces
function removeFunction(codeStr, funcName) {
  const startPattern = new RegExp(`function ${funcName}\\(\\) \\{`);
  const startMatch = codeStr.match(startPattern);
  if (!startMatch) return codeStr;
  
  const startIndex = startMatch.index;
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  let i = startIndex;
  
  // Find the opening brace
  while (i < codeStr.length && codeStr[i] !== '{') {
    i++;
  }
  
  braceCount = 1;
  i++;
  
  while (i < codeStr.length && braceCount > 0) {
    const char = codeStr[i];
    
    // Simple string literal handling
    if ((char === "'" || char === '"' || char === "`") && codeStr[i-1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
    }
    i++;
  }
  
  // Also remove the trailing newlines
  while (i < codeStr.length && (codeStr[i] === '\n' || codeStr[i] === '\r')) {
    i++;
  }
  
  return codeStr.substring(0, startIndex) + codeStr.substring(i);
}

// Remove DatabaseTab
code = removeFunction(code, 'DatabaseTab');
// Remove DataManagementTab
code = removeFunction(code, 'DataManagementTab');

// Remove TabsTriggers
code = code.replace(/\{\s*isAdmin\s*&&\s*\(\s*<TabsTrigger\s+value="database"[\s\S]*?<\/TabsTrigger>\s*\)\s*\}/, '');
code = code.replace(/\{\s*isAdmin\s*&&\s*\(\s*<TabsTrigger\s+value="data"[\s\S]*?<\/TabsTrigger>\s*\)\s*\}/, '');

// Remove TabsContents
code = code.replace(/<TabsContent\s+value="database">[\s\S]*?<DatabaseTab \/>[\s\S]*?<\/TabsContent>/, '');
code = code.replace(/<TabsContent\s+value="data">[\s\S]*?<DataManagementTab \/>[\s\S]*?<\/TabsContent>/, '');

fs.writeFileSync('src/app/(app)/settings/page.tsx', code);
console.log("Settings page cleaned up successfully.");
