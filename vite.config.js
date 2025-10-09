import { sveltekit } from '@sveltejs/kit/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Pre-optimize ProseMirror deps to avoid first-click re-optimization + reload
const proseMirrorDeps = [
  'prosemirror-state',
  'prosemirror-view',
  'prosemirror-history',
  'prosemirror-keymap',
  'prosemirror-commands',
  'prosemirror-model',
  'prosemirror-schema-list',
  'prosemirror-inputrules',
  // common sub-deps used by PM
  'w3c-keyname',
  'orderedmap',
  'rope-sequence',
  'prosemirror-transform'
];

export default defineConfig({
  plugins: [
    // must come before SvelteKit
    enhancedImages(),
    tailwindcss(),
    sveltekit()
  ],
  optimizeDeps: {
    include: proseMirrorDeps
  },
  ssr: {
    // ensure consistent SSR handling for these ESM packages
    noExternal: proseMirrorDeps
  }
});
