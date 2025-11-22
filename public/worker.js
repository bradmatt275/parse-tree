// Web Worker for JSON parsing
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  if (type === 'PARSE_JSON') {
    try {
      // Report progress
      self.postMessage({ type: 'PARSE_PROGRESS', message: 'Parsing JSON...' });
      
      const parsed = JSON.parse(data);
      
      self.postMessage({ type: 'PARSE_PROGRESS', message: 'Building tree structure...' });
      
      const nodes = [];
      let nodeIdCounter = 0;
      let lastProgressReport = Date.now();
      
      function generateNodeId() {
        return `node_${nodeIdCounter++}`;
      }
      
      function buildTree(value, nodes, depth, key, parentId, path = '') {
        // Report progress every 500ms
        const now = Date.now();
        if (now - lastProgressReport > 500) {
          self.postMessage({ 
            type: 'PARSE_PROGRESS', 
            message: `Processing... ${nodes.length.toLocaleString()} nodes built` 
          });
          lastProgressReport = now;
        }
        
        const nodeId = generateNodeId();
        const currentPath = path ? (key ? `${path}.${key}` : path) : key || 'root';
        
        if (value === null) {
          nodes.push({
            id: nodeId,
            type: 'null',
            key,
            value: null,
            depth,
            isExpanded: false,
            hasChildren: false,
            parent: parentId,
            path: currentPath,
          });
          return nodeId;
        }
        
        if (typeof value === 'string') {
          nodes.push({
            id: nodeId,
            type: 'string',
            key,
            value,
            depth,
            isExpanded: false,
            hasChildren: false,
            parent: parentId,
            path: currentPath,
          });
          return nodeId;
        }
        
        if (typeof value === 'number') {
          nodes.push({
            id: nodeId,
            type: 'number',
            key,
            value,
            depth,
            isExpanded: false,
            hasChildren: false,
            parent: parentId,
            path: currentPath,
          });
          return nodeId;
        }
        
        if (typeof value === 'boolean') {
          nodes.push({
            id: nodeId,
            type: 'boolean',
            key,
            value,
            depth,
            isExpanded: false,
            hasChildren: false,
            parent: parentId,
            path: currentPath,
          });
          return nodeId;
        }
        
        if (Array.isArray(value)) {
          nodes.push({
            id: nodeId,
            type: 'array',
            key,
            depth,
            isExpanded: depth < 2,
            hasChildren: value.length > 0,
            childCount: value.length,
            parent: parentId,
            path: currentPath,
          });
          
          value.forEach((item) => {
            buildTree(item, nodes, depth + 1, '', nodeId, currentPath);
          });
          
          return nodeId;
        }
        
        if (typeof value === 'object') {
          const keys = Object.keys(value);
          nodes.push({
            id: nodeId,
            type: 'object',
            key,
            depth,
            isExpanded: depth < 2,
            hasChildren: keys.length > 0,
            childCount: keys.length,
            parent: parentId,
            path: currentPath,
          });
          
          keys.forEach(k => {
            buildTree(value[k], nodes, depth + 1, k, nodeId, currentPath);
          });
          
          return nodeId;
        }
        
        return nodeId;
      }
      
      buildTree(parsed, nodes, 0, '', undefined);
      
      self.postMessage({ 
        type: 'PARSE_PROGRESS', 
        message: `Finalizing ${nodes.length.toLocaleString()} nodes...` 
      });
      
      self.postMessage({
        type: 'PARSE_SUCCESS',
        nodes: nodes
      });
    } catch (error) {
      self.postMessage({
        type: 'PARSE_ERROR',
        error: error.message
      });
    }
  } else if (type === 'EXPAND_TO_MATCHES') {
    try {
      const { nodes, matchIds } = data;
      
      // Create a Map for O(1) lookup instead of O(n) find
      const nodeMap = new Map();
      nodes.forEach(node => nodeMap.set(node.id, node));
      
      const parentPaths = new Set();
      
      // Find all parent paths for all matches
      matchIds.forEach(matchId => {
        const matchNode = nodeMap.get(matchId);
        if (matchNode && matchNode.path) {
          const pathParts = matchNode.path.split('.');
          for (let i = 0; i < pathParts.length; i++) {
            const path = pathParts.slice(0, i + 1).join('.');
            if (path && path !== matchNode.path) {
              parentPaths.add(path);
            }
          }
        }
      });
      
      // Expand all parent nodes
      const expandedNodes = nodes.map(node => {
        if (parentPaths.has(node.path) && node.hasChildren) {
          return { ...node, isExpanded: true };
        }
        return node;
      });
      
      self.postMessage({
        type: 'EXPAND_SUCCESS',
        nodes: expandedNodes
      });
    } catch (error) {
      self.postMessage({
        type: 'EXPAND_ERROR',
        error: error.message
      });
    }
  }
};
