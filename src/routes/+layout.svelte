<script>
  // Self-hosted Jost Variable via static/fonts and @font-face in app.css
  import '../app.css';
  import { setContext } from 'svelte';
  let { children, data } = $props();

  // App-wide editing state via context
  let editing = $state({ on: false });
  setContext('editing', () => editing);

  // Current user via context (reactive to navigation)
  setContext('user', () => data.currentUser);
</script>

<svelte:head>
  <link rel="preload" href="/fonts/jost-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
</svelte:head>

{@render children?.()}
