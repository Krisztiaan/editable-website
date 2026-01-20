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
	    <form method="POST" action={resolve('/admin/env')} class="hidden md:flex items-center gap-1">
	      {#each [
	        { id: 'auto', label: 'Auto' },
	        { id: 'prod', label: 'Prod' },
	        { id: 'staging', label: 'Staging' },
	        { id: 'preview', label: 'Preview' }
	      ] as env (env.id)}
	        <button
          type="submit"
          name="env"
          value={env.id}
          class={`px-3 py-1 text-sm rounded-md border ${
            data.viewEnv === env.id
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          {env.label}
        </button>
      {/each}
    </form>
    <nav class="flex items-center gap-4 text-sm">
      <a class="underline" href={resolve('/')}>Site</a>
      <a class="underline" href={resolve('/admin/pages')}>Pages</a>
      <a class="underline" href={resolve('/logout')}>Sign out</a>
    </nav>
  </div>

  {@render children?.()}
</Limiter>
