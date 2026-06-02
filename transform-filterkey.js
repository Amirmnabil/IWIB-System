module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  let madeChanges = false;
  
  root.find(j.CallExpression, {
    callee: {
      type: 'Identifier',
      name: 'useSupabaseCollection'
    }
  }).forEach(path => {
    const args = path.node.arguments;
    // signature is useSupabaseCollection(table, filter, options)
    if (args.length >= 2) {
      const filterNode = args[1];
      // Ignore if filter is just 'undefined' identifier
      if (filterNode.type === 'Identifier' && filterNode.name === 'undefined') {
        return;
      }
      
      const tableNameNode = args[0];
      const tableName = (tableNameNode.type === 'StringLiteral' || tableNameNode.type === 'Literal') ? tableNameNode.value : 'dynamic';
      const filterKeyString = `${tableName}-filter`;
      
      let optionsNode = args[2];
      if (!optionsNode) {
        optionsNode = j.objectExpression([]);
        args.push(optionsNode);
      }
      
      if (optionsNode.type === 'ObjectExpression') {
        const hasFilterKey = optionsNode.properties.some(p => p.key && (p.key.name === 'filterKey' || p.key.value === 'filterKey'));
        if (!hasFilterKey) {
          optionsNode.properties.push(
            j.property('init', j.identifier('filterKey'), j.literal(filterKeyString))
          );
          madeChanges = true;
        }
      }
    }
  });

  return madeChanges ? root.toSource() : null;
};
