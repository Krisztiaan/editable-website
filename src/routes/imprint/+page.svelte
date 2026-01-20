<script>
  import Footer from '$lib/components/Footer.svelte';
  import PlainText from '$lib/components/PlainText.svelte';
  import RichText from '$lib/components/RichText.svelte';
  import LoginMenu from '$lib/components/LoginMenu.svelte';
  import PrimaryButton from '$lib/components/PrimaryButton.svelte';
  import SecondaryButton from '$lib/components/SecondaryButton.svelte';
  import { acquirePageLockData, getPageData, savePageData, publishPageData } from '../page.remote';
  import { getContext } from 'svelte';
  import WebsiteHeader from '$lib/components/WebsiteHeader.svelte';

  let { data } = $props();

  let showUserMenu = $state(false),
    title = $state(''),
    imprint = $state('');
  const user = getContext('user');
  const editing = getContext('editing');

  // --------------------------------------------------------------------------
  // DEFAULT PAGE CONTENT - AJDUST TO YOUR NEEDS
  // --------------------------------------------------------------------------

  function initOrReset() {
    title = data.page?.title || 'Imprint';
    imprint =
      data.page?.imprint ||
      [
        ['Ken Experiences GmbH', 'Mozartstraße 56', '4020 Linz, Austria'].join('<br/>'),
        [
          'Managing Director: DI Michael Aufreiter',
          'Register No: FN 408728x',
          'Court: Linz',
          'VAT ID: ATU68395257'
        ].join('<br/>')
      ]
        .map(text => `<p>${text}</p>`)
        .join('\n');
  }

  initOrReset();

  async function toggleEdit() {
    try {
      await acquirePageLockData('imprint');
      editing().on = true;
      showUserMenu = false;
    } catch (err) {
      console.error(err);
      alert('This page is locked. Please try again later.');
    }
  }

  async function savePage() {
    if (!user()) return alert('Sorry, you are not authorized.');
    try {
      const payload = {
        pageId: 'imprint',
        page: {
          title,
          imprint
        }
      };
      if (import.meta.env.DEV) {
        try {
          const prev = JSON.stringify(data.page || {});
          const next = JSON.stringify(payload.page);
          if (prev === next) console.warn('[save-page] no changes detected for imprint');
        } catch { /* ignore diff errors */ }
      }
      await savePageData(payload).updates(getPageData(payload.pageId));
      editing().on = false;
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    }
  }

  async function publishPage() {
    if (!user()) return alert('Sorry, you are not authorized.');
    try {
      await publishPageData('imprint');
      showUserMenu = false;
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    }
  }
</script>

<svelte:head>
  <title>Imprint</title>
</svelte:head>

<WebsiteHeader bind:showUserMenu cancel={initOrReset} save={savePage}>
  {#if user()}
    <PrimaryButton onclick={toggleEdit}>Edit page</PrimaryButton>
    <SecondaryButton type="button" onclick={publishPage}>Publish</SecondaryButton>
    <LoginMenu />
  {/if}
</WebsiteHeader>

<div class="py-12 sm:py-24">
  <div class="max-w-screen-md mx-auto px-6 md:text-xl">
    <h1 class="text-4xl md:text-7xl font-bold pb-8">
      <PlainText bind:content={title} />
    </h1>
    <div class="prose md:prose-xl pb-12 sm:pb-24">
      <RichText multiLine bind:content={imprint} />
    </div>
  </div>
</div>

<Footer counter="/imprint" />
