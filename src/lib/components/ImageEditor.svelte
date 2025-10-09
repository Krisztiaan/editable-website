<script>
  import { getContext } from 'svelte';
  import { resizeImage, classNames, getDimensions, is_safari, nanoid } from '$lib/util';
  import { getCroppedImg } from '$lib/cropperUtil';
  import uploadAsset from '$lib/uploadAsset';
  import Cropper from '$lib/components/Cropper.svelte';
  const user = getContext('user');

  export let src;
  export let alt;
  export let uploadPrompt = undefined;
  export let maxWidth;
  export let maxHeight;
  export let quality;
  let className = '';

  export { className as class };

  function onKeyDown(e) {
    // Trigger save
    if (is_cropping && e.key === 'Escape') {
      cancelCropping();
    } else if (is_cropping && e.key === 'Enter') {
      uploadImage();
    }
  }

  let fileInput; // for uploading an image
  let _progress = undefined; // file upload progress
  let overlayEl;

  // Cropper stuff
  let newSrc;
  let cropDetail;
  let is_cropping = false;
  let scale = 1;
  let crop = { x: 0, y: 0 };
  let zoom = 1;

  function cancelCropping() {
    is_cropping = false;
    newSrc = undefined;
    fileInput.value = null;
    scale = 1;
  }

  async function uploadImage() {
    const file = fileInput.files[0];
    const content_type = is_safari() ? 'image/jpeg' : 'image/webp';

    // We convert all uploads to the WEBP image format
    const extension = is_safari() ? 'jpg' : 'webp';
    const path = [['images', nanoid()].join('/'), extension].join('.');
    const croppedImage = await getCroppedImg(newSrc, cropDetail.pixels);

    const resizedBlob = await resizeImage(croppedImage, maxWidth, maxHeight, quality, content_type);
    const resizedFile = new File([resizedBlob], `${file.name.split('.')[0]}.${extension}`, {
      type: content_type
    });

    _progress = 0;
    try {
      if (user()) {
        await uploadAsset(resizedFile, path, p => {
          _progress = p;
        });
        src = `/assets/${path}`;
      } else {
        src = URL.createObjectURL(resizedFile);
      }
      _progress = undefined;
    } catch (err) {
      console.error(err);
      alert('An error occured. Please try again');
      _progress = undefined;
    }
    cancelCropping();
    fileInput.value = null;
  }

  async function startCropping() {
    const file = fileInput.files[0];
    const { width, height } = await getDimensions(file);
    const currentAspectRatio = width / height;
    const desiredAspectRatio = maxWidth / maxHeight;

    // HACK: We zoom into the cropper so it fills the whole image area.
    // TODO: We should do this properly by adjusting Cropper.svelte
    if (desiredAspectRatio > currentAspectRatio) {
      scale = desiredAspectRatio / currentAspectRatio;
    } else {
      scale = currentAspectRatio / desiredAspectRatio;
    }

    // Preview image for cropping
    newSrc = URL.createObjectURL(file);
    is_cropping = true;
  }
</script>

<div
  bind:this={overlayEl}
  class={classNames(
    is_cropping
      ? 'z-40 bg-black text-white font-bold fixed inset-0 bg-opacity-80 text-center p-6'
      : 'hidden'
  )}
  ondblclick={cancelCropping}
  role="button"
  tabindex="0"
  aria-label="Cancel cropping"
>
  {#if is_safari()}
    <span class="text-[#EF174C]">ATTENTION:</span> Use Google Chrome, Firefox, oder Microsoft Edge for optimized image quality and size.
  {:else}
    Confirm with ENTER. Cancel with ESC.
  {/if}
</div>

{#if is_cropping}
  <div class="flex space-x-4 z-[60] fixed bottom-0 right-0 left-0 p-6">
    <div class="flex-1"></div>
    <button class="bg-[#EF174C] text-white rounded-full px-4 py-2" onclick={uploadImage}
      >Confirm</button
    >
    <button class="bg-white text-black rounded-full px-4 py-2" onclick={cancelCropping}
      >Cancel</button
    >
    <div class="flex-1"></div>
  </div>
{/if}

<div
  style={`aspect-ratio: ${maxWidth}/${maxHeight}; scale: ${scale}`}
  class={classNames(is_cropping ? `z-50` : '', 'relative')}
  ondblclick={uploadImage}
  role="button"
  tabindex="0"
  aria-label="Confirm crop"
>
  {#if is_cropping}
    <Cropper
      image={newSrc}
      bind:crop
      bind:zoom
      cropcomplete={e => (cropDetail = e.detail)}
      aspect={maxWidth / maxHeight}
    />
  {:else}
    <button
      type="button"
      aria-label={uploadPrompt || 'Select image'}
      class="p-0 m-0 bg-transparent border-0"
      onclick={() => fileInput.click()}
    >
      <img
        class={className + ' cursor-pointer outline-[2px] hover:outline-dashed outline-[#EF174C] -outline-offset-[2px]'}
        {src}
        {alt}
        title={uploadPrompt}
      />
    </button>
  {/if}
</div>

<input
  class="w-px h-px opacity-0 fixed -top-40"
  type="file"
  accept="image/*"
  name="imagefile"
  bind:this={fileInput}
  onchange={startCropping}
/>

<svelte:window on:keydown={onKeyDown} />
  const user = getContext('user');
