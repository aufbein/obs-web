<script>
  export let name
  export let buttonStyle = 'text'
  export let icon = '#ffffff'
  export let isProgram = false
  export let isPreview = false
  export let img = ''

  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  $: style = icon.startsWith('#')
    ? `background-color: ${icon};`
    : `background-image: url(${icon});`
</script>

<button
  class:title={buttonStyle === 'text'}
  class:program={isProgram}
  class:preview={isPreview}
  class:with-icon={buttonStyle === 'icon'}
  on:click={() => dispatch('click')}
  style={buttonStyle === 'icon' ? style : ''}
  title={name}
  >
  {#if img}<img src={img} alt={name} class="thumbnail" />{/if}
  {#if buttonStyle !== 'icon'}{name}{/if}
</button>

<style>
  button {
    border: none;
    height: 4rem;
    text-align: center;
    width: 100%;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1) no-repeat center center / cover;
    color: #fff;
    border-radius: 10px;
    transition: all 0.3s ease;
    font-weight: 500;
    letter-spacing: 0.5px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(5px);
    position: relative;
    overflow: hidden;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 243, 12, 0.2);
    border-color: rgba(120, 243, 12, 0.3);
  }

  button:active {
    transform: translateY(0);
  }

  button.preview {
    background: rgba(120, 243, 12, 0.15);
    border-color: rgba(120, 243, 12, 0.3);
  }

  button.preview::before {
    content: "Preview";
    position: absolute;
    top: 5px;
    right: 5px;
    font-size: 0.6rem;
    background: #78f30c;
    color: #202837;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: bold;
    opacity: 0.9;
  }

  button.program {
    background: rgba(120, 243, 12, 0.25);
    border-color: #78f30c;
  }

  button.program::before {
    content: "Live";
    position: absolute;
    top: 5px;
    right: 5px;
    font-size: 0.6rem;
    background: #78f30c;
    color: #202837;
    padding: 2px 6px;
    border-radius: 8px;
    font-weight: bold;
    opacity: 0.9;
  }

  button:not(.title) {
    padding: 0;
    width: 192px;
    height: 126px;
  }

  button.with-icon {
    height: 80px;
    width: 80px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    margin: 0.5em;
    border-radius: 15px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.1) no-repeat center center / cover;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  button.with-icon:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 4px 15px rgba(120, 243, 12, 0.25);
    border-color: rgba(120, 243, 12, 0.3);
  }

  button.with-icon.program {
    border-color: #78f30c;
    box-shadow: 0 0 15px rgba(120, 243, 12, 0.3);
  }

  button.with-icon.program::before {
    content: "";
    position: absolute;
    top: -4px;
    right: -4px;
    background: #78f30c;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  button.with-icon.preview {
    border-color: rgba(120, 243, 12, 0.5);
    box-shadow: 0 0 10px rgba(120, 243, 12, 0.2);
  }

  button.with-icon.preview::before {
    content: "";
    position: absolute;
    top: -4px;
    right: -4px;
    background: rgba(120, 243, 12, 0.5);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .thumbnail {
    display: block;
    max-width: 100%;
    max-height: calc(100% - 1rem);
    margin: 0 auto;
    border-radius: 8px;
  }
</style>
