<script>
  import PlainText from '$lib/components/PlainText.svelte';
  import RichText from '$lib/components/RichText.svelte';
  import { acquirePageLockData, getPageData, savePageData, publishPageData } from './page.remote';
  import PrimaryButton from '$lib/components/PrimaryButton.svelte';
  import SecondaryButton from '$lib/components/SecondaryButton.svelte';
  import LoginMenu from '$lib/components/LoginMenu.svelte';
  import ArticleTeaser from '$lib/components/ArticleTeaser.svelte';
  import Testimonial from '$lib/components/Testimonial.svelte';
  import IntroStep from '$lib/components/IntroStep.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import Image from '$lib/components/Image.svelte';
  import NotEditable from '$lib/components/NotEditable.svelte';
  import { getContext } from 'svelte';
  import WebsiteHeader from '$lib/components/WebsiteHeader.svelte';

  let { data } = $props();

  // --------------------------------------------------------------------------
  // DEFAULT PAGE CONTENT - AJDUST TO YOUR NEEDS
  // --------------------------------------------------------------------------
  const EMAIL = 'michael@letsken.com';

  // Can contain spaces but must not contain the + sign
  const PHONE_NUMBER = '43 664 1533015';

  const FAQS_PLACEHOLDER = `
		<h2>Question 1</h2>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras mi lectus, pellentesque nec urna eget, pretium dictum arcu. In rutrum pretium leo, id efficitur nisl ullamcorper sit amet.</p>
    <h2>Question 2</h2>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras mi lectus, pellentesque nec urna eget, pretium dictum arcu. In rutrum pretium leo, id efficitur nisl ullamcorper sit amet.</p>
	`;

  const BIO_PLACEHOLDER = `
		<p>Modern tools, such as Svelte and Tailwind allow you to easily hand-craft fast and beautiful websites. What’s missing is the ability to <strong>make edits without changing the source code</strong>.</p>
		<p>With this <a href="https://github.com/michael/editable-website">open-source website template</a>, I want to fill that gap.</p>
    <p>If you have questions or need any help, contact me.</p>
	`;

  const TESTIMONIALS_PLACEHOLDER = [
    {
      text: '“Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras mi lectus, pellentesque nec urna eget, pretium dictum arcu. In rutrum pretium leo, id efficitur nisl ullamcorper sit amet.”',
      image: '/images/person-placeholder.jpg',
      name: 'Jane Doe · jane-doe.org'
    }
  ];

  let title = $state('');
  let testimonials = $state([]);
  let faqs = $state('');
  let introStep1 = $state();
  let introStep2 = $state();
  let introStep3 = $state();
  let introStep4 = $state();
  let bioTitle = $state('');
  let bioPicture = $state('');
  let bio = $state('');
  let showUserMenu = $state(false);
  const user = getContext('user');
  const editing = getContext('editing');

  function initOrReset() {
    title = data.page?.title || 'Untitled Website';
    faqs = data.page?.faqs || FAQS_PLACEHOLDER;

    // Make a deep copy
    testimonials = JSON.parse(JSON.stringify(data.page?.testimonials || TESTIMONIALS_PLACEHOLDER));

    introStep1 = JSON.parse(
      JSON.stringify(
        data.page?.introStep1 || {
          label: 'THE PROBLEM',
          title: 'The problem statement',
          description: 'Describe the problem you are solving in a short sentence.'
        }
      )
    );
    introStep2 = JSON.parse(
      JSON.stringify(
        data.page?.introStep2 || {
          label: 'THE DREAM',
          title: 'This is how it should be.',
          description: 'Describe why it should be like that.'
        }
      )
    );
    introStep3 = JSON.parse(
      JSON.stringify(
        data.page?.introStep3 || {
          label: 'THE REALITY',
          title: 'A statement why it is not that easy.',
          description: 'Describe the reality a bit more.'
        }
      )
    );
    introStep4 = JSON.parse(
      JSON.stringify(
        data.page?.introStep4 || {
          label: 'THE PROMISE',
          title: 'Still the solution is worth it.',
          description: 'And why this is, should be described here.'
        }
      )
    );
    bioPicture = data.page?.bioPicture || '/images/person-placeholder.jpg';
    bioTitle = data.page?.bioTitle || "Hi, I'm Michael — I want your website to be editable.";
    bio = data.page?.bio || BIO_PLACEHOLDER;
    editing().on = false;
  }

  // --------------------------------------------------------------------------
  // Page logic
  // --------------------------------------------------------------------------

  async function toggleEdit() {
    try {
      await acquirePageLockData('home');
      editing().on = true;
      showUserMenu = false;
    } catch (err) {
      console.error(err);
      alert('This page is locked. Please try again later.');
    }
  }

  function addTestimonial() {
    testimonials.push({
      text: '“Add a quote text here”',
      image: '/images/person-placeholder.jpg',
      name: 'Firstname Lastname · example.com'
    });
  }

  function deleteTestimonial(index) {
    testimonials.splice(index, 1);
  }

  function moveTestimonial(index, direction) {
    let toIndex;
    if (direction === 'up' && index > 0) {
      toIndex = index - 1;
    } else if (direction === 'down' && index < testimonials.length - 1) {
      toIndex = index + 1;
    } else {
      return; // operation not possible
    }
    // Remove item from original position
    const element = testimonials.splice(index, 1)[0];
    // Insert at new position
    testimonials.splice(toIndex, 0, element);
  }

  async function savePage() {
    try {
      if (!user()) {
        alert('Sorry, you are not authorized. Please log in at /login.');
        return;
      }
      const payload = {
        pageId: 'home',
        page: {
          title,
          faqs,
          testimonials: $state.snapshot(testimonials),
          introStep1: $state.snapshot(introStep1),
          introStep2: $state.snapshot(introStep2),
          introStep3: $state.snapshot(introStep3),
          introStep4: $state.snapshot(introStep4),
          bioPicture,
          bioTitle,
          bio
        }
      };
      if (import.meta.env.DEV) {
        try {
          const prev = JSON.stringify(data.page || {});
          const next = JSON.stringify(payload.page);
          if (prev === next) console.warn('[save-page] no changes detected for home');
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
    try {
      if (!user()) {
        alert('Sorry, you are not authorized. Please log in at /login.');
        return;
      }
      await publishPageData('home');
      showUserMenu = false;
    } catch (err) {
      console.error(err);
      alert('There was an error. Please try again.');
    }
  }

  initOrReset();
</script>

<svelte:head>
  <title>Make your website editable</title>
  <meta name="description" content="Make changes to your website while browsing it." />
  <link rel="alternate" hreflang="en" href="https://editable.website" />
  <link rel="canonical" href="https://editable.website" />
</svelte:head>

<WebsiteHeader bind:showUserMenu cancel={initOrReset} save={savePage}>
  {#if user()}
    <PrimaryButton onclick={toggleEdit}>Edit page</PrimaryButton>
    <SecondaryButton type="button" onclick={publishPage}>Publish</SecondaryButton>
    <LoginMenu />
  {/if}
</WebsiteHeader>

<div>
  <div class="max-w-screen-md mx-auto px-6 pt-12 sm:pt-24">
    <NotEditable>
      <svg
        class="pb-8 w-14 sm:w-24 mx-auto"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M164 110L64 163.768V200L164 147.059V110Z" fill="#111827" />
        <path d="M136 66L36 119.768V156L136 103.059V66Z" fill="#111827" />
        <path d="M164 0L64 53.7684V90L164 37.0588V0Z" fill="#111827" />
      </svg>
    </NotEditable>
    <h1 class="text-4xl md:text-7xl font-bold text-center">
      <PlainText bind:content={title} />
    </h1>
    {#if user()}
      <NotEditable>
        <div class="text-center pt-8 pb-4 bounce text-xl">↓</div>
        <div class="text-center">
          <PrimaryButton size="lg" type="button" onclick={toggleEdit}>Edit</PrimaryButton>
        </div>
      </NotEditable>
    {/if}
  </div>
</div>

<div class="pt-12 md:pt-24 border-gray-100 border-b-2">
  <div class="max-w-screen-md mx-auto px-6">
    <div class="relative">
      <div class="w-1 bg-gray-900 absolute inset-0 -top-8 bottom-12 mx-auto z-0">
        <div class="w-4 h-4 rounded-full bg-gray-900 absolute -top-1 -left-[6px]"></div>
      </div>
      <div class="z-10">
        <IntroStep bind:intro={introStep1} />
        <IntroStep bind:intro={introStep2} />
        <IntroStep bind:intro={introStep3} />
        <IntroStep bind:intro={introStep4} />
      </div>
    </div>
    <div class="relative h-14">
      <div class="w-1 bg-gray-900 absolute inset-0 -top-16 bottom-12 mx-auto z-0">
        <div
          class="absolute -bottom-2 -left-[7px] h-0 w-0 border-x-[9px] border-x-transparent border-t-[10px] border-gray-900"
        ></div>
      </div>
    </div>
    <div class="text-center mb-32">
      <PrimaryButton
        size="lg"
        type="button"
        onclick={() =>
          document.getElementById('contact').scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >Create an editable website</PrimaryButton
      >
    </div>
  </div>
</div>

<div class="bg-white pb-6 sm:pb-12">
  <div class="max-w-screen-md mx-auto px-6">
    <div class="font-bold text-sm sm:text-base py-12 sm:pt-24 pb-8">WHAT PEOPLE SAY</div>
  </div>
  {#each testimonials as _, i (i)}
    <Testimonial
      bind:testimonial={testimonials[i]}
      firstEntry={i === 0}
      lastEntry={i === testimonials.length - 1}
      delete={() => deleteTestimonial(i)}
      up={() => moveTestimonial(i, 'up')}
      down={() => moveTestimonial(i, 'down')}
    />
  {/each}

  {#if editing().on}
    <div class="text-center pb-12 border-b border-gray-100">
      <SecondaryButton onclick={addTestimonial}>Add testimonial</SecondaryButton>
    </div>
  {/if}
</div>

{#if data.articles.length > 0}
  <NotEditable>
    <div class="bg-white border-t-2 border-gray-100 pb-10 sm:pb-16">
      <div class="max-w-screen-md mx-auto px-6 pt-12 sm:pt-24">
        <div class="font-bold text-sm sm:text-base">FROM THE BLOG</div>
      </div>
      {#each data.articles as article, i (article.slug || i)}
        <ArticleTeaser {article} firstEntry={i === 0} />
      {/each}
    </div>
  </NotEditable>
{/if}

<!-- Bio -->
<div id="contact" class="bg-white border-t-2 border-b-2 border-gray-100 pb-12 sm:pb-24">
  <div class="max-w-screen-md mx-auto px-6">
    <div class="pt-12 sm:pt-24 pb-12 text-center">
      <div class="w-48 h-48 md:w-72 md:h-72 mx-auto overflow-hidden relative rounded-full">
        <Image
          class="block w-48 h-48 md:w-72 md:h-72 rounded-full"
          maxWidth="384"
          maxHeight="384"
          quality="0.8"
          bind:src={bioPicture}
          alt="Michael Aufreiter"
        />
      </div>

    </div>
    <div class="">
      <h1 class="text-3xl md:text-5xl font-bold">
        <PlainText bind:content={bioTitle} />
      </h1>
    </div>
    <div class="prose md:prose-xl pb-6">
      <RichText multiLine bind:content={bio} />
    </div>

    <NotEditable>
      <div class="flex flex-col sm:flex-row sm:space-x-6 md:space-x-8 space-y-4 sm:space-y-0">
        <PrimaryButton size="lg" href={`mailto:${EMAIL}`}>Email</PrimaryButton>
        <SecondaryButton size="lg" href={`https://wa.me/${PHONE_NUMBER.replace(/\s+/g, '')}`}>
          WhatsApp (+{PHONE_NUMBER})
        </SecondaryButton>
      </div>
    </NotEditable>
  </div>
</div>

<!-- FAQs -->
<div class="bg-white">
  <div class="max-w-screen-md mx-auto px-6">
    <div class="font-bold text-sm sm:text-base pt-12 sm:pt-24 -mb-6 md:-mb-12">FAQs</div>
    <div class="prose md:prose-xl pb-12 sm:pb-24">
      <RichText multiLine bind:content={faqs} />
    </div>
  </div>
</div>

<Footer counter="/" />
