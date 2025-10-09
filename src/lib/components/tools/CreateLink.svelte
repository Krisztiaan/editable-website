<script>
  import { classNames } from '$lib/util';
  import { toggleMark } from 'prosemirror-commands';
  import { createLink } from '$lib/editor/prosemirrorCommands';

  let { editorView, editorState, children } = $props();

  const schema = $derived(editorState.schema);
  const disabled = $derived(!createLink(editorState, null, editorView));

  function handleClick() {
    let url = prompt('Enter link URL', 'https://example.com');
    if (url) {
      toggleMark(schema.marks.link, { href: url })(editorState, editorView.dispatch);
      editorView.focus();
    }
  }
</script>

<button
  onclick={handleClick}
  {disabled}
  class={classNames('disabled:opacity-30 rounded-full p-2 sm:mx-1 hover:bg-gray-100')}
>
  {@render children?.()}
</button>
