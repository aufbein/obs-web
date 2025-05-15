<script>
  export let isOpen = false;
  export let onClose;
  
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click={handleBackdropClick}>
    <div class="modal-content">
      <button class="modal-close" on:click={onClose}></button>
      <slot></slot>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: rgba(32, 40, 55, 0.98);
    padding: 2rem;
    border-radius: 12px;
    position: relative;
    width: 90%;
    max-width: 500px;
    border: 1px solid rgba(120, 243, 12, 0.1);
    color: white;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }

  .modal-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.5rem;
    line-height: 1;
    transition: all 0.3s ease;
  }

  .modal-close:hover {
    color: #78f30c;
    transform: scale(1.1);
  }
</style> 