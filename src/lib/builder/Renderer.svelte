<script>
  import { getContext } from 'svelte';
  import Self from './Renderer.svelte';
  import Container from './primitives/Container.svelte';
  import Stack from './primitives/Stack.svelte';
  import Row from './primitives/Row.svelte';
  import Text from './primitives/Text.svelte';
  import RichText from './primitives/RichText.svelte';
  import Image from './primitives/Image.svelte';
  import Button from './primitives/Button.svelte';
  import { canHaveChildren } from './ir.js';

  let { node } = $props();
  const builder = getContext('builder');
  const actions = getContext('builderActions');

  const isSelected = $derived(builder()?.selectedId === node.id);
  const isHovered = $derived(builder()?.hoveredId === node.id);
  const wrapperClass = $derived.by(() => {
    if (node.type === 'Button') return 'inline-block align-middle self-start';
    return 'block';
  });
  const wrapperRadiusClass = $derived.by(() => {
    if (node.type === 'Button') return 'rounded-full';
    return 'rounded';
  });

  function selectNode(e) {
    try {
      const target = /** @type {Element | null} */ (e?.target);
      const anchor = target?.closest?.('a');
      if (anchor) e.preventDefault();
    } catch {
      // ignore
    }
    e.stopPropagation();
    actions.select(node.id);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectNode(e);
    }
  }

  function onMouseEnter() {
    actions.hover(node.id);
  }

  function onMouseLeave() {
    if (builder()?.hoveredId === node.id) actions.clearHover();
  }

  function startDragExisting(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-builder-node', node.id);
    actions.select(node.id);
    actions.startDragExisting(node.id);
  }

  function onDragEnd() {
    actions.endDrag();
  }
</script>

{#if node.type === 'Placeholder'}
  <div
    class="h-12 border-2 border-dashed border-emerald-400 rounded bg-emerald-50/40 pointer-events-none"
    aria-hidden="true"
  ></div>
{:else}
  <div
    class={`relative ${wrapperRadiusClass} ${wrapperClass} ${isSelected ? 'ring-2 ring-blue-500' : isHovered ? 'ring-1 ring-blue-200' : ''}`}
    data-editor-node-id={node.id}
    role="button"
    tabindex="0"
    onclick={selectNode}
    onkeydown={onKeyDown}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
  >
    <button
      type="button"
      class={`absolute -left-3 top-2 z-10 h-7 w-7 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 active:bg-gray-100 ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'} transition-opacity`}
      draggable="true"
      ondragstart={startDragExisting}
      ondragend={onDragEnd}
      onclick={selectNode}
      aria-label="Drag"
      title="Drag to move"
    >
      ⋮⋮
    </button>

    {#if isHovered || isSelected}
      <div class="absolute -top-3 left-0 z-10 pointer-events-none">
        <div class="text-[10px] font-bold px-2 py-1 rounded bg-white border border-gray-200 text-gray-600">
          {node.type}
        </div>
      </div>
    {/if}

    {#if node.type === 'Container'}
      <Container maxWidth={node.props.maxWidth} padding={node.props.padding}>
        {#each node.children || [] as child (child.id)}
          <Self node={child} />
        {/each}
        {#if (node.children || []).length === 0}
          <div class="mt-4 border-2 border-dashed border-gray-200 rounded p-4 text-xs text-gray-500">
            Drop here
          </div>
        {/if}
      </Container>
    {:else if node.type === 'Stack'}
      <Stack gap={node.props.gap} align={node.props.align}>
        {#each node.children || [] as child (child.id)}
          <Self node={child} />
        {/each}
        {#if (node.children || []).length === 0}
          <div class="border-2 border-dashed border-gray-200 rounded p-4 text-xs text-gray-500">
            Drop here
          </div>
        {/if}
      </Stack>
    {:else if node.type === 'Row'}
      <Row
        gap={node.props.gap}
        wrap={node.props.wrap !== false}
        justify={node.props.justify}
        align={node.props.align}
      >
        {#each node.children || [] as child (child.id)}
          <Self node={child} />
        {/each}
        {#if (node.children || []).length === 0}
          <div class="border-2 border-dashed border-gray-200 rounded p-4 text-xs text-gray-500">
            Drop here
          </div>
        {/if}
      </Row>
    {:else if node.type === 'Text'}
      <Text bind:text={node.props.text} tag={node.props.tag || 'p'} align={node.props.align || 'left'} />
    {:else if node.type === 'RichText'}
      <RichText bind:html={node.props.html} align={node.props.align || 'left'} />
    {:else if node.type === 'Image'}
      <Image bind:src={node.props.src} alt={node.props.alt || 'Image'} />
    {:else if node.type === 'Button'}
      <Button
        bind:label={node.props.label}
        href={node.props.href}
        kind={node.props.kind || 'primary'}
        size={node.props.size || 'default'}
      />
    {:else}
      {#if canHaveChildren(node.type)}
        {#each node.children || [] as child (child.id)}
          <Self node={child} />
        {/each}
      {/if}
    {/if}
  </div>
{/if}
