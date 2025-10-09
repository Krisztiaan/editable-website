<script>
  let { value = '', id, type = 'text', name, required = false, inputRef = null, placeholder = '' } = $props();
  function setType(node) {
    node.type = type;
  }
</script>

<input
  autocomplete="off"
  use:setType
  {placeholder}
  {name}
  {id}
  {required}
  bind:value
  bind:this={inputRef}
  class="border focus focus:border-gray-800 focus:ring-gray-800"
/>
