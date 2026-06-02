module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  let madeChanges = false;
  
  // Find CallExpressions where the callee is a MemberExpression for 'insert' or 'upsert'
  root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      property: {
        type: 'Identifier',
        name: (name) => name === 'insert' || name === 'upsert'
      }
    }
  }).forEach(path => {
    // Check if the argument is already wrapped in sanitizeUUIDs
    const args = path.node.arguments;
    if (args.length === 1 && args[0].type === 'CallExpression' && args[0].callee.name === 'sanitizeUUIDs') {
      return;
    }
    
    // Wrap the first argument
    if (args.length > 0) {
      const originalArg = args[0];
      path.node.arguments[0] = j.callExpression(
        j.identifier('sanitizeUUIDs'),
        [originalArg]
      );
      madeChanges = true;
    }
  });

  if (madeChanges) {
    // Add import statement if not already present
    const hasImport = root.find(j.ImportDeclaration, {
      source: { value: '@/lib/utils/sanitize-uuids' }
    }).size() > 0;
    
    if (!hasImport) {
      const importDecl = j.importDeclaration(
        [j.importSpecifier(j.identifier('sanitizeUUIDs'))],
        j.literal('@/lib/utils/sanitize-uuids')
      );
      
      const firstImport = root.find(j.ImportDeclaration).at(0);
      if (firstImport.size() > 0) {
        firstImport.insertBefore(importDecl);
      } else {
        root.get().node.program.body.unshift(importDecl);
      }
    }
  }

  return root.toSource();
};
