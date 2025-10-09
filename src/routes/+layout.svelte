<script>
  // Self-hosted Jost Variable via static/fonts and @font-face in app.css

  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <link rel="preload" href="/fonts/jost-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
</svelte:head>

{@render children?.()}
