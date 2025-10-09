<script>
  import { extractTeaser } from '$lib/util';
  import { goto } from '$app/navigation';
  import Footer from '$lib/components/Footer.svelte';
  import EditableWebsiteTeaser from '$lib/components/EditableWebsiteTeaser.svelte';
  import NotEditable from '$lib/components/NotEditable.svelte';
  import WebsiteHeader from '$lib/components/WebsiteHeader.svelte';
  import { getContext } from 'svelte';
  import { createPost } from '../data.remote';

  // no page data used on this route

  let showUserMenu = $state(false),
    title = $state('Untitled'),
    content = $state('Copy and paste your text here.');

  const user = getContext('user');
  const editing = getContext('editing');
  // Enable editing by default when authenticated on this page
  $effect(() => {
    editing().on = !!user();
  });

  async function createArticle() {
    if (!user()) {
      return alert('Sorry, you are not authorized to create new articles.');
    }
    const teaser = extractTeaser(document.getElementById('article_content'));
    try {
      const { slug } = await createPost({ title, content, teaser });
      goto(`/blog/${slug}`);
    } catch (err) {
      console.error(err);
      alert('A document with that title has already been published. Choose a different title.');
    }
  }

  async function discardDraft() {
    goto('/blog');
  }
</script>

<svelte:head>
  <title>New blog post</title>
</svelte:head>

<WebsiteHeader bind:showUserMenu cancel={discardDraft} save={createArticle} />

{#if user()}
  {#await import('$lib/components/Article.svelte') then Article}
    <Article.default bind:title bind:content />
  {/await}
{:else}
  <div class="max-w-screen-md mx-auto px-6 py-12">
    <p>You need to <a class="underline" href="/login">log in</a> to create a new post.</p>
  </div>
{/if}

<NotEditable>
  <EditableWebsiteTeaser />
</NotEditable>

<Footer counter="/blog/new" />
