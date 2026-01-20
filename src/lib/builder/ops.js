/**
 * @typedef {import('./ir.js').BuilderNode} BuilderNode
 */

import { canHaveChildren, createNode } from './ir.js';

/**
 * @param {BuilderNode} root
 * @param {string} nodeId
 * @returns {BuilderNode | null}
 */
export function findNode(root, nodeId) {
  if (!root) return null;
  if (root.id === nodeId) return root;
  for (const child of root.children || []) {
    const hit = findNode(child, nodeId);
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {BuilderNode} root
 * @param {string} ancestorId
 * @param {string} nodeId
 * @returns {boolean}
 */
export function isDescendant(root, ancestorId, nodeId) {
  const ancestor = findNode(root, ancestorId);
  if (!ancestor) return false;
  return Boolean(findNode(ancestor, nodeId));
}

/**
 * @param {BuilderNode} root
 * @param {string} nodeId
 * @returns {{ parent: BuilderNode; index: number } | null}
 */
export function findParent(root, nodeId) {
  const children = root.children || [];
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.id === nodeId) return { parent: root, index: i };
    const hit = findParent(child, nodeId);
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {BuilderNode} root
 * @param {string} nodeId
 * @returns {boolean}
 */
export function removeNode(root, nodeId) {
  const parentInfo = findParent(root, nodeId);
  if (!parentInfo) return false;
  parentInfo.parent.children.splice(parentInfo.index, 1);
  return true;
}

/**
 * @param {BuilderNode} root
 * @param {string} targetId
 * @param {'before'|'after'|'inside'} where
 * @param {BuilderNode} newNode
 * @returns {boolean}
 */
export function insertAt(root, targetId, where, newNode) {
  const target = findNode(root, targetId);
  if (!target) return false;

  if (where === 'inside') {
    if (!canHaveChildren(target.type)) return false;
    if (!Array.isArray(target.children)) target.children = [];
    target.children.push(newNode);
    return true;
  }

  const parentInfo = findParent(root, targetId);
  if (!parentInfo) return false;
  const insertIndex = where === 'before' ? parentInfo.index : parentInfo.index + 1;
  parentInfo.parent.children.splice(insertIndex, 0, newNode);
  return true;
}

/**
 * @param {BuilderNode} root
 * @param {string} nodeId
 * @param {'up'|'down'} direction
 * @returns {boolean}
 */
export function moveWithinParent(root, nodeId, direction) {
  const parentInfo = findParent(root, nodeId);
  if (!parentInfo) return false;

  const { parent, index } = parentInfo;
  const toIndex = direction === 'up' ? index - 1 : index + 1;
  if (toIndex < 0 || toIndex >= parent.children.length) return false;

  const [node] = parent.children.splice(index, 1);
  parent.children.splice(toIndex, 0, node);
  return true;
}

/**
 * @param {BuilderNode} root
 * @param {string} nodeId
 * @param {string} targetId
 * @param {'before'|'after'|'inside'} where
 * @returns {boolean}
 */
export function moveNode(root, nodeId, targetId, where) {
  if (nodeId === root.id) return false;
  if (nodeId === targetId) return false;
  if (isDescendant(root, nodeId, targetId)) return false;

  const parentInfo = findParent(root, nodeId);
  if (!parentInfo) return false;

  const [node] = parentInfo.parent.children.splice(parentInfo.index, 1);

  const ok = insertAt(root, targetId, where, node);
  if (ok) return true;

  // restore
  parentInfo.parent.children.splice(parentInfo.index, 0, node);
  return false;
}

/**
 * @param {BuilderNode} node
 * @returns {boolean}
 */
function isLayoutWrapper(node) {
  return node?.type === 'Row' || node?.type === 'Stack';
}

/**
 * Remove unnecessary layout wrappers (Row/Stack) that have 0 or 1 children.
 * Mutates the tree in-place.
 *
 * @param {BuilderNode} root
 */
export function cleanupLayout(root) {
  if (!root || !Array.isArray(root.children)) return;

  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i];
    cleanupLayout(child);

    if (!isLayoutWrapper(child)) continue;
    const children = Array.isArray(child.children) ? child.children : [];

    if (children.length === 0) {
      root.children.splice(i, 1);
      i--;
      continue;
    }

    if (children.length === 1) {
      root.children[i] = children[0];
      i--;
    }
  }
}

/**
 * Ensure the drop target has a sibling container of the desired type.
 * If not, it wraps the target node into a new container at the same position.
 *
 * @param {BuilderNode} root
 * @param {string} targetId
 * @param {'Row'|'Stack'} containerType
 * @returns {{ container: BuilderNode; targetIndex: number } | null}
 */
function ensureSiblingContainer(root, targetId, containerType) {
  if (targetId === root.id) {
    return { container: root, targetIndex: 0 };
  }

  const parentInfo = findParent(root, targetId);
  if (!parentInfo) return null;

  const parent = parentInfo.parent;
  const index = parentInfo.index;

  if (parent.type === containerType) {
    return { container: parent, targetIndex: index };
  }

  const target = parent.children?.[index];
  if (!target) return null;

  const wrapperProps =
    containerType === 'Row'
      ? { gap: 'md', justify: 'start', align: 'center', wrap: true }
      : { gap: 'md', align: 'stretch' };

  const wrapper = createNode(containerType, wrapperProps, [target]);
  parent.children.splice(index, 1, wrapper);
  return { container: wrapper, targetIndex: 0 };
}

/**
 * Insert a node relative to a target, with smart wrapping for left/right/top/bottom.
 *
 * @param {BuilderNode} root
 * @param {BuilderNode} node
 * @param {string} targetId
 * @param {'before'|'after'|'inside'|'left'|'right'|'top'|'bottom'} where
 * @returns {boolean}
 */
export function insertNodeSmart(root, node, targetId, where) {
  if (!findNode(root, targetId)) return false;

  if (where === 'inside' || where === 'before' || where === 'after') {
    return insertAt(root, targetId, where, node);
  }

  // Dropping on the root container uses "inside" semantics
  if (targetId === root.id) {
    return insertAt(root, targetId, 'inside', node);
  }

  const containerType = where === 'left' || where === 'right' ? 'Row' : 'Stack';
  const siblingWhere = where === 'left' || where === 'top' ? 'before' : 'after';

  const ensured = ensureSiblingContainer(root, targetId, containerType);
  if (!ensured) return false;

  const { container, targetIndex } = ensured;
  if (!Array.isArray(container.children)) container.children = [];

  const insertIndex = siblingWhere === 'before' ? targetIndex : targetIndex + 1;
  container.children.splice(insertIndex, 0, node);
  return true;
}

/**
 * Move a node relative to a target, with smart wrapping for left/right/top/bottom.
 *
 * @param {BuilderNode} root
 * @param {string} nodeId
 * @param {string} targetId
 * @param {'before'|'after'|'inside'|'left'|'right'|'top'|'bottom'} where
 * @returns {boolean}
 */
export function moveNodeSmart(root, nodeId, targetId, where) {
  if (nodeId === root.id) return false;
  if (nodeId === targetId) return false;
  if (!findNode(root, targetId)) return false;
  if (isDescendant(root, nodeId, targetId)) return false;

  const parentInfo = findParent(root, nodeId);
  if (!parentInfo) return false;

  const [node] = parentInfo.parent.children.splice(parentInfo.index, 1);

  const ok = insertNodeSmart(root, node, targetId, where);
  if (ok) return true;

  // restore
  parentInfo.parent.children.splice(parentInfo.index, 0, node);
  return false;
}
