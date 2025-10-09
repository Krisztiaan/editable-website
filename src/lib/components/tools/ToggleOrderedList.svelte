<script>
  import { classNames } from '$lib/util';
  import { wrapInList } from 'prosemirror-schema-list';

  let { editorView, editorState, children } = $props();

  const schema = $derived(editorState.schema);
  const disabled = $derived(!wrapInList(schema.nodes.ordered_list)(editorView.state));

  function handleClick() {
    wrapInList(schema.nodes.ordered_list)(editorState, editorView.dispatch);
    editorView.focus();
  }
</script>

<button
  onclick={handleClick}
  {disabled}
  class={classNames('disabled:opacity-30 rounded-full p-2 sm:mx-1 hover:bg-gray-100')}
>
  {@render children?.()}
</button>
