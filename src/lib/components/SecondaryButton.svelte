<script>
  import BaseButton from '$lib/components/BaseButton.svelte';
  let { disabled = undefined, type = 'button', size = undefined, href = undefined, onclick, children } = $props();
</script>

<BaseButton
  {href}
  {type}
  {size}
  {disabled}
  {onclick}
  styles="font-medium hover:bg-gray-100 focus:ring-gray-100 border-2 border-gray-100 bg-white"
>
  {@render children?.()}
</BaseButton>
