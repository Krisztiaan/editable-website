import { canHaveChildren } from './ir.js';

/**
 * Minimal serializer that produces readable Svelte for storage and future build steps.
 * In Option A, runtime rendering uses the IR. This output is canonical for build/publish later.
 *
 * @typedef {import('./ir.js').BuilderDocV1} BuilderDocV1
 * @typedef {import('./ir.js').BuilderNode} BuilderNode
 */

/**
 * @param {unknown} v
 * @returns {string}
 */
function jsLiteral(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return JSON.stringify(v);
}

/**
 * @param {Record<string, any>} props
 * @returns {string}
 */
function propsToAttrs(props) {
  const entries = Object.entries(props || {}).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return (
    ' ' +
    entries
      .map(([k, v]) => {
        if (typeof v === 'string') return `${k}=${JSON.stringify(v)}`;
        return `${k}={${jsLiteral(v)}}`;
      })
      .join(' ')
  );
}

/**
 * @param {BuilderNode} node
 * @param {number} indent
 * @returns {string}
 */
function nodeToSvelte(node, indent) {
  if (node.type === 'Placeholder') return '';

  const pad = '  '.repeat(indent);
  const attrs = propsToAttrs(node.props);

  if (canHaveChildren(node.type)) {
    const children = (node.children || []).map((c) => nodeToSvelte(c, indent + 1)).filter(Boolean);
    if (children.length === 0) return `${pad}<${node.type}${attrs} />`;
    return [
      `${pad}<${node.type}${attrs}>`,
      ...children,
      `${pad}</${node.type}>`
    ].join('\n');
  }

  return `${pad}<${node.type}${attrs} />`;
}

/**
 * @param {BuilderNode} node
 * @param {Set<string>} out
 */
function collectTypes(node, out) {
  if (node.type === 'Placeholder') return;
  out.add(node.type);
  for (const child of node.children || []) collectTypes(child, out);
}

const TYPE_TO_IMPORT = {
  Container: "$lib/builder/primitives/Container.svelte",
  Stack: "$lib/builder/primitives/Stack.svelte",
  Row: "$lib/builder/primitives/Row.svelte",
  Text: "$lib/builder/primitives/Text.svelte",
  RichText: "$lib/builder/primitives/RichText.svelte",
  Image: "$lib/builder/primitives/Image.svelte",
  Button: "$lib/builder/primitives/Button.svelte"
};

/**
 * @param {BuilderDocV1} doc
 * @returns {string}
 */
export function serializeDocToSvelte(doc) {
  const usedTypes = new Set();
  collectTypes(doc.root, usedTypes);

  const importLines = [...usedTypes]
    .sort()
    .map((t) => {
      const path = TYPE_TO_IMPORT[t];
      if (!path) return null;
      return `  import ${t} from '${path}';`;
    })
    .filter(Boolean)
    .join('\n');

  const template = nodeToSvelte(doc.root, 0);

  return `<script lang="ts">
  // @editor:script:begin generated
${importLines || '  // (no imports)'}
  // @editor:script:end generated

  // @editor:script:begin dev
  // (dev-owned)
  // @editor:script:end dev
</script>

<!-- @editor:template:begin -->
${template}
<!-- @editor:template:end -->
`;
}
