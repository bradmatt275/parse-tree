export type JsonValueType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

export interface TreeNode {
  id: string;
  type: JsonValueType;
  key?: string;
  value?: any;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  childCount?: number;
  parent?: string;
  path: string;
  index?: number;
}

export interface ParseResult {
  nodes: TreeNode[];
  error?: string;
}

let nodeIdCounter = 0;

function generateNodeId(): string {
  return `node_${nodeIdCounter++}`;
}

export function resetNodeCounter(): void {
  nodeIdCounter = 0;
}

export function parseJsonToTree(jsonString: string): ParseResult {
  resetNodeCounter();
  
  try {
    const parsed = JSON.parse(jsonString);
    const nodes: TreeNode[] = [];
    
    buildTree(parsed, nodes, 0, '', undefined);
    
    return { nodes };
  } catch (error) {
    return {
      nodes: [],
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
}

function buildTree(
  value: any,
  nodes: TreeNode[],
  depth: number,
  key: string,
  parentId?: string,
  path: string = '',
  index?: number
): string {
  const nodeId = generateNodeId();
  const currentPath = path ? (key ? `${path}.${key}` : `${path}[${nodes.filter(n => n.parent === parentId).length}]`) : key || 'root';
  
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
      index,
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
      index,
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
      index,
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
      index,
    });
    return nodeId;
  }
  
  if (Array.isArray(value)) {
    nodes.push({
      id: nodeId,
      type: 'array',
      key,
      depth,
      isExpanded: depth < 2, // Auto-expand first 2 levels
      hasChildren: value.length > 0,
      childCount: value.length,
      parent: parentId,
      path: currentPath,
      index,
    });
    
    value.forEach((item, idx) => {
      buildTree(item, nodes, depth + 1, String(idx), nodeId, currentPath, idx);
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
      isExpanded: depth < 2, // Auto-expand first 2 levels
      hasChildren: keys.length > 0,
      childCount: keys.length,
      parent: parentId,
      path: currentPath,
      index,
    });
    
    keys.forEach(k => {
      buildTree(value[k], nodes, depth + 1, k, nodeId, currentPath);
    });
    
    return nodeId;
  }
  
  return nodeId;
}

export function getVisibleNodes(allNodes: TreeNode[]): TreeNode[] {
  const visible: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();
  
  // Build a map for quick lookups
  allNodes.forEach(node => nodeMap.set(node.id, node));
  
  for (const node of allNodes) {
    // Check if all parents are expanded
    let parent = node.parent ? nodeMap.get(node.parent) : null;
    let isVisible = true;
    
    while (parent) {
      if (!parent.isExpanded) {
        isVisible = false;
        break;
      }
      parent = parent.parent ? nodeMap.get(parent.parent) : null;
    }
    
    if (isVisible) {
      visible.push(node);
    }
  }
  
  return visible;
}

export function toggleNode(nodes: TreeNode[], nodeId: string): TreeNode[] {
  return nodes.map(node => {
    if (node.id === nodeId && node.hasChildren) {
      return { ...node, isExpanded: !node.isExpanded };
    }
    return node;
  });
}

export function expandAll(nodes: TreeNode[]): TreeNode[] {
  return nodes.map(node => ({ ...node, isExpanded: true }));
}

export function collapseAll(nodes: TreeNode[]): TreeNode[] {
  return nodes.map(node => ({ ...node, isExpanded: false }));
}

export function searchNodes(nodes: TreeNode[], query: string): Set<string> {
  const matches = new Set<string>();
  
  if (!query.trim()) {
    return matches;
  }
  
  const lowerQuery = query.toLowerCase();
  
  nodes.forEach(node => {
    // Search in keys
    if (node.key && node.key.toLowerCase().includes(lowerQuery)) {
      matches.add(node.id);
    }
    
    // Search in string values
    if (node.type === 'string' && typeof node.value === 'string') {
      if (node.value.toLowerCase().includes(lowerQuery)) {
        matches.add(node.id);
      }
    }
    
    // Search in number values (convert to string)
    if (node.type === 'number') {
      if (String(node.value).includes(query)) {
        matches.add(node.id);
      }
    }
    
    // Search in path
    if (node.path.toLowerCase().includes(lowerQuery)) {
      matches.add(node.id);
    }
  });
  
  return matches;
}

export function expandToNode(nodes: TreeNode[], targetNodeId: string): TreeNode[] {
  // Find the target node
  const targetNode = nodes.find(node => node.id === targetNodeId);
  if (!targetNode) return nodes;
  
  // Find all parent paths
  const targetPath = targetNode.path;
  const pathParts = targetPath.split('.');
  const parentPaths = new Set<string>();
  
  for (let i = 0; i < pathParts.length; i++) {
    const path = pathParts.slice(0, i + 1).join('.');
    if (path && path !== targetPath) {
      parentPaths.add(path);
    }
  }
  
  // Expand all parent nodes
  return nodes.map(node => {
    if (parentPaths.has(node.path) && node.hasChildren) {
      return { ...node, isExpanded: true };
    }
    return node;
  });
}

export function expandToMatches(nodes: TreeNode[], matchIds: Set<string>): TreeNode[] {
  const parentPaths = new Set<string>();
  
  // Find all parent paths for all matches
  matchIds.forEach(matchId => {
    const matchNode = nodes.find(node => node.id === matchId);
    if (matchNode) {
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
  return nodes.map(node => {
    if (parentPaths.has(node.path) && node.hasChildren) {
      return { ...node, isExpanded: true };
    }
    return node;
  });
}

