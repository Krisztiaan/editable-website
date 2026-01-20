<script>
  import Limiter from '$lib/components/Limiter.svelte';
  import { resolve } from '$app/paths';
  let { children, data } = $props();
</script>

<Limiter>
  <div class="py-8 flex items-center justify-between gap-6">
    <div>
      <div class="text-xl font-bold">Admin</div>
      <div class="text-sm text-gray-500">Signed in as {data.currentUser?.name}</div>
    </div>
    <nav class="flex items-center gap-4 text-sm">
      <a class="underline" href={resolve('/')}>Site</a>
      <a class="underline" href={resolve('/admin/pages')}>Pages</a>
      <a class="underline" href={resolve('/logout')}>Sign out</a>
    </nav>
  </div>

  {@render children?.()}
</Limiter>
