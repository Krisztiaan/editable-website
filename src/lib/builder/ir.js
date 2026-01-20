import { nanoid } from '$lib/util';

/**
 * @typedef {'Container'|'Stack'|'Row'|'Text'|'RichText'|'Image'|'Button'|'Placeholder'} BuilderNodeType
 *
 * @typedef {Object} BuilderNode
 * @property {string} id
 * @property {BuilderNodeType} type
 * @property {Record<string, any>} props
 * @property {BuilderNode[]=} children
 *
 * @typedef {Object} BuilderDocV1
 * @property {'builder-doc'} kind
 * @property {1} version
 * @property {BuilderNode} root
 */

/**
 * @param {BuilderNodeType} type
 * @param {Record<string, any>=} props
 * @param {BuilderNode[]=} children
 * @returns {BuilderNode}
 */
export function createNode(type, props = {}, children = undefined) {
  /** @type {BuilderNode} */
  const node = {
    id: nanoid(),
    type,
    props
  };
  if (children) node.children = children;
  return node;
}

/**
 * @returns {BuilderDocV1}
 */
export function createDefaultDoc() {
  return {
    kind: 'builder-doc',
    version: 1,
    root: createNode(
      'Container',
      { maxWidth: 'xl', padding: 'md' },
      [
        createNode('Stack', { gap: 'lg' }, [
          createNode('Text', { tag: 'h1', text: 'A page built live', align: 'left' }),
          createNode('RichText', {
            html: '<p>Edit this page while looking at it. Add blocks, move them, and publish with pointers.</p>',
            align: 'left'
          }),
          createNode('Row', { gap: 'md', justify: 'start', align: 'center', wrap: true }, [
            createNode('Button', { kind: 'primary', label: 'Primary CTA', href: '#' }),
            createNode('Button', { kind: 'secondary', label: 'Secondary', href: '#' })
          ])
        ])
      ]
    )
  };
}

/**
 * @param {BuilderNodeType} type
 * @returns {boolean}
 */
export function canHaveChildren(type) {
  return type === 'Container' || type === 'Stack' || type === 'Row';
}
