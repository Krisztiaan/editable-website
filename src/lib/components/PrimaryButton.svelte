<script>
  import BaseButton from '$lib/components/BaseButton.svelte';
  let { disabled = undefined, type = 'button', size = undefined, href = undefined, onclick, children } = $props();
</script>

<BaseButton
  {type}
  {size}
  {disabled}
  {href}
  {onclick}
  styles="font-medium hover:bg-gray-800 focus:ring-gray-900 border-2 border-transparent bg-gray-900 text-white"
>
  {@render children?.()}
</BaseButton>
