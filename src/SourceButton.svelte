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
  {#if img}
    <div class="image-container">
      <img src={img} alt={name} class="thumbnail" />
      {#if isProgram}
        <div class="live-tag">
          <span class="live-dot"></span>
          AO VIVO
        </div>
      {/if}
    </div>
  {/if}
  {#if buttonStyle !== 'icon'}
    <div class="content">
      <div class="main-info">
        <span class="name">{name}</span>
        {#if isProgram}
          <span class="tag live">AO VIVO</span>
        {:else if isPreview}
          <span class="tag preview">PREVIEW</span>
        {/if}
      </div>
    </div>
  {/if}
</button>

<style>
  button {
    width: 100%;
    min-height: 60px;
    border: none;
    cursor: pointer;
    background: #1E1E1E;
    color: #fff;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
    padding: 0;
    margin-bottom: 8px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    border: 1px solid rgba(120, 243, 12, 0.1);
  }

  button:active {
    background: #252525;
  }

  .image-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .live-tag {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(30, 30, 30, 0.9);
    padding: 6px 10px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #78f30c;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(120, 243, 12, 0.2);
  }

  .live-dot {
    width: 6px;
    height: 6px;
    background: #78f30c;
    border-radius: 50%;
    display: inline-block;
    animation: blink 1.5s ease-in-out infinite;
  }

  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }

  .content {
    padding: 12px 16px;
  }

  .main-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .name {
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag {
    font-size: 11px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tag.live {
    background: rgba(120, 243, 12, 0.15);
    color: #78f30c;
    border: 1px solid rgba(120, 243, 12, 0.2);
  }

  .tag.preview {
    background: rgba(120, 243, 12, 0.1);
    color: #78f30c;
    border: 1px solid rgba(120, 243, 12, 0.15);
  }

  button.preview {
    background: #1E1E1E;
    border: 1px solid rgba(120, 243, 12, 0.3);
  }

  button.program {
    background: #1E1E1E;
    border: 1px solid #78f30c;
  }

  button:not(.title) {
    height: 180px;
  }

  button.with-icon {
    width: 60px;
    height: 60px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1E1E1E;
    border-radius: 8px;
    margin: 4px;
  }

  button.with-icon.program {
    border: 1px solid #78f30c;
  }

  button.with-icon.preview {
    border: 1px solid rgba(120, 243, 12, 0.3);
  }

  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (min-width: 769px) {
    button {
      min-height: 64px;
    }

    .name {
      font-size: 15px;
    }

    button.with-icon {
      width: 64px;
      height: 64px;
      margin: 6px;
    }

    .tag {
      font-size: 12px;
    }

    .live-tag {
      font-size: 13px;
      padding: 7px 12px;
    }
  }

  @media (hover: hover) {
    button:hover {
      background: #252525;
      border-color: rgba(120, 243, 12, 0.2);
    }

    button.program:hover {
      border-color: #78f30c;
    }

    button.with-icon:hover {
      background: #252525;
    }
  }
</style>
