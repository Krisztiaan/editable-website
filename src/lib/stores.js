import { writable } from 'svelte/store';

// Editor toolbar state bridge; kept as a store local to editor internals
export const activeEditorView = writable(null);
