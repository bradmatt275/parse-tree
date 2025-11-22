import { TreeNode } from './jsonParser';

export interface XmlParseResult {
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

export function parseXmlToTree(xmlString: string): XmlParseResult {
  resetNodeCounter();
  
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return {
        nodes: [],
        error: parserError.textContent || 'Invalid XML'
      };
    }
    
    const nodes: TreeNode[] = [];
    const root = xmlDoc.documentElement;
    
    if (!root) {
      return {
        nodes: [],
        error: 'No root element found'
      };
    }
    
    buildXmlTree(root, nodes, 0, '', undefined);
    
    return { nodes };
  } catch (error) {
    return {
      nodes: [],
      error: error instanceof Error ? error.message : 'Invalid XML'
    };
  }
}

function buildXmlTree(
  element: Element | ChildNode,
  nodes: TreeNode[],
  depth: number,
  key: string,
  parentId?: string,
  path: string = ''
): string {
  const nodeId = generateNodeId();
  
  // Handle text nodes
  if (element.nodeType === Node.TEXT_NODE) {
    const textContent = element.textContent?.trim();
    if (!textContent) return nodeId; // Skip empty text nodes
    
    const currentPath = path ? `${path}.text` : 'text';
    nodes.push({
      id: nodeId,
      type: 'string',
      key: undefined,
      value: textContent,
      depth,
      isExpanded: false,
      hasChildren: false,
      parent: parentId,
      path: currentPath,
    });
    return nodeId;
  }
  
  // Handle element nodes
  if (element.nodeType === Node.ELEMENT_NODE) {
    const elem = element as Element;
    const tagName = key || elem.tagName;
    const currentPath = path ? `${path}.${tagName}` : tagName;
    
    const attributes = elem.attributes;
    const childNodes = Array.from(elem.childNodes).filter(
      node => node.nodeType === Node.ELEMENT_NODE || 
              (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
    );
    
    const hasChildren = attributes.length > 0 || childNodes.length > 0;
    
    // Create node for the element
    nodes.push({
      id: nodeId,
      type: 'object',
      key: tagName,
      depth,
      isExpanded: depth < 2,
      hasChildren,
      childCount: attributes.length + childNodes.length,
      parent: parentId,
      path: currentPath,
    });
    
    // Add attributes as children
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      const attrNodeId = generateNodeId();
      const attrPath = `${currentPath}.@${attr.name}`;
      
      nodes.push({
        id: attrNodeId,
        type: 'string',
        key: `@${attr.name}`,
        value: attr.value,
        depth: depth + 1,
        isExpanded: false,
        hasChildren: false,
        parent: nodeId,
        path: attrPath,
      });
    }
    
    // Add child nodes
    if (childNodes.length === 1 && childNodes[0].nodeType === Node.TEXT_NODE) {
      // If there's only one text child, add it as the value
      const textContent = childNodes[0].textContent?.trim();
      if (textContent) {
        const textNodeId = generateNodeId();
        const textPath = `${currentPath}.text`;
        
        nodes.push({
          id: textNodeId,
          type: 'string',
          key: undefined,
          value: textContent,
          depth: depth + 1,
          isExpanded: false,
          hasChildren: false,
          parent: nodeId,
          path: textPath,
        });
      }
    } else {
      // Multiple children or element children
      childNodes.forEach((child) => {
        buildXmlTree(child, nodes, depth + 1, '', nodeId, currentPath);
      });
    }
    
    return nodeId;
  }
  
  return nodeId;
}

export function serializeTreeToXml(jsonInput: string): string {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(jsonInput, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML');
    }
    
    const serializer = new XMLSerializer();
    const serialized = serializer.serializeToString(xmlDoc);
    
    // Format the XML with indentation
    return formatXml(serialized);
  } catch (error) {
    throw new Error('Failed to serialize XML');
  }
}

function formatXml(xml: string): string {
  let formatted = '';
  let indent = 0;
  
  xml.split(/>\s*</).forEach((node) => {
    if (node.match(/^\/\w/)) indent--; // Closing tag
    formatted += '  '.repeat(indent) + '<' + node + '>\n';
    if (node.match(/^<?\w[^>]*[^\/]$/)) indent++; // Opening tag
  });
  
  return formatted.substring(1, formatted.length - 2);
}
