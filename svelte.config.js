import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    csrf: {
      // SvelteKit v2+: prefer trustedOrigins over deprecated checkOrigin
      // This replicates the previous checkOrigin: false behaviour
      trustedOrigins: ['*']
    },
    // Enable experimental tracing + instrumentation entry
    experimental: {
      tracing: { server: true }
    }
  },
  preprocess: vitePreprocess()
};

export default config;
