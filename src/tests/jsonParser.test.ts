import { describe, it, expect } from 'vitest';
import {
  parseJsonToTree,
  getVisibleNodes,
  toggleNode,
  expandAll,
  collapseAll,
  searchNodes,
  expandToNode,
  type TreeNode,
} from '../jsonParser';

describe('jsonParser', () => {
  describe('parseJsonToTree', () => {
    it('should parse simple object', () => {
      const json = '{"name": "test", "value": 42}';
      const { nodes, error } = parseJsonToTree(json);
      
      expect(error).toBeUndefined();
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0].type).toBe('object');
      expect(nodes[0].depth).toBe(0);
      expect(nodes[0].hasChildren).toBe(true);
    });

    it('should parse nested objects', () => {
      const json = '{"parent": {"child": "value"}}';
      const { nodes } = parseJsonToTree(json);
      
      const parentNode = nodes.find((n: TreeNode) => n.key === 'parent');
      const childNode = nodes.find((n: TreeNode) => n.key === 'child');
      
      expect(parentNode).toBeDefined();
      expect(childNode).toBeDefined();
      expect(childNode?.depth).toBe(2);
      expect(childNode?.parent).toBe(parentNode?.id);
    });

    it('should parse arrays', () => {
      const json = '{"items": [1, 2, 3]}';
      const { nodes } = parseJsonToTree(json);
      
      const arrayNode = nodes.find((n: TreeNode) => n.key === 'items');
      expect(arrayNode?.type).toBe('array');
      expect(arrayNode?.childCount).toBe(3);
    });

    it('should auto-expand first 2 levels', () => {
      const json = '{"level1": {"level2": {"level3": "value"}}}';
      const { nodes } = parseJsonToTree(json);
      
      const level1 = nodes.find((n: TreeNode) => n.key === 'level1');
      const level2 = nodes.find((n: TreeNode) => n.key === 'level2');
      const level3 = nodes.find((n: TreeNode) => n.key === 'level3');
      
      expect(nodes[0].isExpanded).toBe(true); // root
      expect(level1?.isExpanded).toBe(true); // depth 1
      expect(level2?.isExpanded).toBe(false); // depth 2
      expect(level3?.isExpanded).toBe(false); // depth 3
    });

    it('should handle different value types', () => {
      const json = '{"str": "text", "num": 42, "bool": true, "null": null}';
      const { nodes } = parseJsonToTree(json);
      
      const strNode = nodes.find((n: TreeNode) => n.key === 'str');
      const numNode = nodes.find((n: TreeNode) => n.key === 'num');
      const boolNode = nodes.find((n: TreeNode) => n.key === 'bool');
      const nullNode = nodes.find((n: TreeNode) => n.key === 'null');
      
      expect(strNode?.type).toBe('string');
      expect(strNode?.value).toBe('text');
      expect(numNode?.type).toBe('number');
      expect(numNode?.value).toBe(42);
      expect(boolNode?.type).toBe('boolean');
      expect(boolNode?.value).toBe(true);
      expect(nullNode?.type).toBe('null');
      expect(nullNode?.value).toBe(null);
    });

    it('should generate correct dot-notation paths', () => {
      const json = '{"user": {"profile": {"name": "John"}}}';
      const { nodes } = parseJsonToTree(json);
      
      const userNode = nodes.find((n: TreeNode) => n.key === 'user');
      const profileNode = nodes.find((n: TreeNode) => n.key === 'profile');
      const nameNode = nodes.find((n: TreeNode) => n.key === 'name');
      
      expect(userNode?.path).toBe('root.user');
      expect(profileNode?.path).toBe('root.user.profile');
      expect(nameNode?.path).toBe('root.user.profile.name');
    });

    it('should handle array indices in paths', () => {
      const json = '{"items": [{"name": "first"}, {"name": "second"}]}';
      const { nodes } = parseJsonToTree(json);
      
      // Find the name nodes and check their values
      const nameNodes = nodes.filter((n: TreeNode) => n.key === 'name');
      
      expect(nameNodes.length).toBe(2);
      expect(nameNodes[0]?.value).toBe('first');
      expect(nameNodes[1]?.value).toBe('second');
      
      // Paths use dot notation: items.0.name, items.1.name
      expect(nameNodes[0]?.path).toMatch(/items.*0.*name/);
      expect(nameNodes[1]?.path).toMatch(/items.*1.*name/);
    });

    it('should handle empty objects and arrays', () => {
      const json = '{"empty_obj": {}, "empty_arr": []}';
      const { nodes } = parseJsonToTree(json);
      
      const emptyObj = nodes.find((n: TreeNode) => n.key === 'empty_obj');
      const emptyArr = nodes.find((n: TreeNode) => n.key === 'empty_arr');
      
      expect(emptyObj?.hasChildren).toBe(false);
      expect(emptyObj?.childCount).toBe(0);
      expect(emptyArr?.hasChildren).toBe(false);
      expect(emptyArr?.childCount).toBe(0);
    });

    it('should assign unique IDs to each node', () => {
      const json = '{"a": 1, "b": {"c": 2}, "d": [3, 4]}';
      const { nodes } = parseJsonToTree(json);
      
      const ids = nodes.map((n: TreeNode) => n.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should return error for invalid JSON', () => {
      const invalidJson = '{invalid json}';
      const { nodes, error } = parseJsonToTree(invalidJson);
      
      expect(error).toBeDefined();
      expect(nodes).toEqual([]);
    });
  });

  describe('getVisibleNodes', () => {
    it('should return only expanded nodes', () => {
      const json = '{"parent": {"child": "value"}}';
      const { nodes } = parseJsonToTree(json);
      
      const visible = getVisibleNodes(nodes);
      
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.some((n: TreeNode) => n.key === 'parent')).toBe(true);
    });

    it('should hide children of collapsed nodes', () => {
      const json = '{"parent": {"child": "value"}}';
      let { nodes } = parseJsonToTree(json);
      
      nodes = collapseAll(nodes);
      const visible = getVisibleNodes(nodes);
      
      expect(visible.length).toBe(1);
      expect(visible[0].depth).toBe(0);
    });
  });

  describe('toggleNode', () => {
    it('should expand collapsed node', () => {
      const json = '{"parent": {"child": "value"}}';
      let { nodes } = parseJsonToTree(json);
      
      const parentNode = nodes.find((n: TreeNode) => n.key === 'parent')!;
      nodes = collapseAll(nodes);
      
      expect(nodes.find((n: TreeNode) => n.id === parentNode.id)?.isExpanded).toBe(false);
      
      nodes = toggleNode(nodes, parentNode.id);
      
      expect(nodes.find((n: TreeNode) => n.id === parentNode.id)?.isExpanded).toBe(true);
    });

    it('should collapse expanded node', () => {
      const json = '{"parent": {"child": "value"}}';
      let { nodes } = parseJsonToTree(json);
      
      const parentNode = nodes.find((n: TreeNode) => n.key === 'parent')!;
      
      expect(nodes.find((n: TreeNode) => n.id === parentNode.id)?.isExpanded).toBe(true);
      
      nodes = toggleNode(nodes, parentNode.id);
      
      expect(nodes.find((n: TreeNode) => n.id === parentNode.id)?.isExpanded).toBe(false);
    });
  });

  describe('expandAll / collapseAll', () => {
    it('should expand all nodes', () => {
      const json = '{"a": {"b": {"c": {"d": "value"}}}}';
      let { nodes } = parseJsonToTree(json);
      
      nodes = expandAll(nodes);
      
      expect(nodes.every((n: TreeNode) => !n.hasChildren || n.isExpanded)).toBe(true);
    });

    it('should collapse all nodes', () => {
      const json = '{"a": {"b": {"c": "value"}}}';
      let { nodes } = parseJsonToTree(json);
      nodes = expandAll(nodes);
      
      nodes = collapseAll(nodes);
      
      const expandedNodes = nodes.filter((n: TreeNode) => n.hasChildren && n.isExpanded);
      expect(expandedNodes.length).toBe(0);
    });
  });

  describe('searchNodes', () => {
    it('should find nodes by key', () => {
      const json = '{"username": "john", "email": "john@example.com"}';
      const { nodes } = parseJsonToTree(json);
      
      const matches = searchNodes(nodes, 'username');
      
      expect(matches.size).toBeGreaterThan(0);
      const matchingNode = nodes.find((n: TreeNode) => matches.has(n.id) && n.key === 'username');
      expect(matchingNode).toBeDefined();
    });

    it('should find nodes by value', () => {
      const json = '{"name": "Alice", "city": "Wonderland"}';
      const { nodes } = parseJsonToTree(json);
      
      const matches = searchNodes(nodes, 'wonderland');
      
      expect(matches.size).toBeGreaterThan(0);
      const matchingNode = nodes.find((n: TreeNode) => matches.has(n.id) && n.value === 'Wonderland');
      expect(matchingNode).toBeDefined();
    });

    it('should be case-insensitive', () => {
      const json = '{"Name": "ALICE"}';
      const { nodes } = parseJsonToTree(json);
      
      const matchesLower = searchNodes(nodes, 'name');
      const matchesUpper = searchNodes(nodes, 'NAME');
      
      expect(matchesLower.size).toBeGreaterThan(0);
      expect(matchesUpper.size).toBe(matchesLower.size);
    });

    it('should return empty set for no matches', () => {
      const json = '{"name": "test"}';
      const { nodes } = parseJsonToTree(json);
      
      const matches = searchNodes(nodes, 'nonexistent');
      
      expect(matches.size).toBe(0);
    });

    it('should handle empty search query', () => {
      const json = '{"name": "test"}';
      const { nodes } = parseJsonToTree(json);
      
      const matches = searchNodes(nodes, '');
      
      expect(matches.size).toBe(0);
    });
  });

  describe('expandToNode', () => {
    it('should expand all nodes in a path', () => {
      const json = '{"a": {"b": {"c": "value"}}}';
      let { nodes } = parseJsonToTree(json);
      nodes = collapseAll(nodes);
      
      const targetNode = nodes.find((n: TreeNode) => n.key === 'c')!;
      nodes = expandToNode(nodes, targetNode.id);
      
      const nodeA = nodes.find((n: TreeNode) => n.key === 'a')!;
      const nodeB = nodes.find((n: TreeNode) => n.key === 'b')!;
      
      expect(nodeA.isExpanded).toBe(true);
      expect(nodeB.isExpanded).toBe(true);
    });
  });

  describe('performance', () => {
    it('should handle large objects efficiently', () => {
      const largeObj: Record<string, number> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = i;
      }
      const json = JSON.stringify(largeObj);
      
      const start = performance.now();
      const { nodes } = parseJsonToTree(json);
      const duration = performance.now() - start;
      
      expect(nodes.length).toBeGreaterThan(1000);
      expect(duration).toBeLessThan(1000); // Should complete in <1s
    });

    it('should handle getVisibleNodes efficiently with many nodes', () => {
      const largeObj: Record<string, number> = {};
      for (let i = 0; i < 5000; i++) {
        largeObj[`key${i}`] = i;
      }
      const json = JSON.stringify(largeObj);
      const { nodes } = parseJsonToTree(json);
      
      const start = performance.now();
      const visible = getVisibleNodes(nodes);
      const duration = performance.now() - start;
      
      expect(visible.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200); // Should complete in <200ms
    });
  });
});
