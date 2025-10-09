<script>
  import { toggleMark } from 'prosemirror-commands';
  import { markActive } from '$lib/editor/prosemirrorUtil';
  import { classNames } from '$lib/util';

  let { editorView, editorState, type, children } = $props();

  const schema = $derived(editorState.schema);
  const markType = $derived(schema.marks[type]);
  const command = $derived(toggleMark(markType));
  const disabled = $derived(!markType || !command(editorState, null));
  const active = $derived(markActive(markType)(editorState));

  function handleClick() {
    command(editorState, editorView.dispatch, editorView);
    editorView.focus();
  }
</script>

<button
  onclick={handleClick}
  {disabled}
  class={classNames(
    active ? 'bg-gray-900 text-white' : 'hover:bg-gray-100',
    'sm:mx-1 rounded-full p-2 disabled:opacity-30'
  )}
>
  {@render children?.()}
</button>
