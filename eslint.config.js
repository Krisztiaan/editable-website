// ESLint flat config for Svelte 5 + Kit v2
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
  { ignores: ['.svelte-kit/**', 'build/**', 'node_modules/**'] },
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  ...svelte.configs['flat/prettier'],
  {
    files: ['**/*.svelte'],
    rules: {
      'svelte/no-at-html-tags': 'off',
      // Treat Svelte compile issues as errors to catch invalid bindings in CI
      'svelte/valid-compile': ['error', { ignoreWarnings: false }]
      ,
      // New in eslint-plugin-svelte v3; we rely on SvelteKit base handling
      'svelte/no-navigation-without-resolve': 'off'
    }
  },
  {
    // relaxed unused vars across project (prefix with _ to ignore)
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['src/lib/api.js', 'src/**/+server.js', 'src/**/*.server.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  }
];
