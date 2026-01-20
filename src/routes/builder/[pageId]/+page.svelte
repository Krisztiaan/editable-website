<script>
  import BuilderApp from '$lib/builder/BuilderApp.svelte';
  import { getPageData, publishPageData, savePageData } from '../../page.remote';

  let { data } = $props();

  async function onSave(payload) {
    try {
      await savePageData(payload).updates(getPageData(payload.pageId));
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    }
  }

  async function onPublish(pageId) {
    try {
      await publishPageData(pageId);
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    }
  }
</script>

<BuilderApp initialPage={data.page} pageId={data.pageId} {onSave} {onPublish} />

