<script>
  import BuilderApp from '$lib/builder/BuilderApp.svelte';
  import {
    acquirePageLockData,
    getPageData,
    promoteDraftToPreviewData,
    savePageData
  } from '../../page.remote';

  let { data } = $props();

  const LOCK_HEARTBEAT_MS = 4 * 60 * 1000;
  $effect(() => {
    const pageId = data.pageId;
    const timer = setInterval(() => {
      acquirePageLockData(pageId).catch((err) => console.error('[lock-heartbeat]', err));
    }, LOCK_HEARTBEAT_MS);
    return () => clearInterval(timer);
  });

  async function onSave(payload) {
    try {
      await savePageData(payload).updates(getPageData(payload.pageId));
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    }
  }

  async function onPromoteToPreview(pageId) {
    try {
      await promoteDraftToPreviewData(pageId);
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    }
  }
</script>

<BuilderApp initialPage={data.page} pageId={data.pageId} {onSave} {onPromoteToPreview} />
