<script>
  import PrimaryButton from '$lib/components/PrimaryButton.svelte';
  import SecondaryButton from '$lib/components/SecondaryButton.svelte';
  import PlainText from '$lib/components/PlainText.svelte';

  let { label = $bindable('Button'), href = '#', kind = 'primary', size = 'default' } = $props();
</script>

{#if kind === 'secondary'}
  <SecondaryButton {href} {size}><PlainText bind:content={label} /></SecondaryButton>
{:else}
  <PrimaryButton {href} {size}><PlainText bind:content={label} /></PrimaryButton>
{/if}
