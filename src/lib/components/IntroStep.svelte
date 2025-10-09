<script>
  import PlainText from './PlainText.svelte';
  import RichText from './RichText.svelte';

  let { intro = $bindable({ label: '', title: '', description: '' }) } = $props();
</script>

<div class="my-12">
  <div class="bg-white relative py-8 mt-20 mb-20">
    <div class="font-bold text-center text-sm sm:text-base">
      <PlainText bind:content={intro.label} />
    </div>
    <div class="text-2xl md:text-5xl font-bold text-center pt-2">
      <PlainText bind:content={intro.title} />
    </div>
    <div class="max-w-md mx-auto text-lg md:text-2xl text-center pt-2 md:pt-4">
      <RichText bind:content={intro.description} />
    </div>
  </div>
</div>
