<script>
  import Image from '$lib/components/Image.svelte';

  let {
    src = $bindable('/images/person-placeholder.jpg'),
    alt = 'Image',
    maxWidth = 768,
    maxHeight = 512
  } = $props();
</script>

<div class="w-full">
  <Image class="block w-full rounded-lg" bind:src alt={alt} {maxWidth} {maxHeight} quality="0.8" />
</div>
