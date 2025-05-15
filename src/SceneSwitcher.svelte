<script>
  import { onMount } from 'svelte'
  import { obs, sendCommand } from './obs.js'
  import SourceButton from './SourceButton.svelte'

  export let programScene = {}
  export let previewScene = {}
  export let scenes = []
  export let buttonStyle = 'text' // text, screenshot, icon
  export let editable = false

  let scenesFiltered = []
  let isStudioMode = false
  const sceneIcons = JSON.parse(window.localStorage.getItem('sceneIcons') || '{}')
  let activeTab = 0

  $: scenesFiltered = scenes.filter((scene) => scene.sceneName.indexOf('(hidden)') === -1).reverse()
  // store sceneIcons on change
  $: window.localStorage.setItem('sceneIcons', JSON.stringify(sceneIcons))

  onMount(async function () {
    let data = await sendCommand('GetSceneList')
    console.log('GetSceneList', data)
    programScene = data.currentProgramSceneName || ''
    previewScene = data.currentPreviewSceneName
    scenes = data.scenes
    data = await sendCommand('GetStudioModeEnabled')
    if (data && data.studioModeEnabled) {
      isStudioMode = true
      previewScene = data.currentPreviewSceneName || ''
    }
  })

  obs.on('StudioModeStateChanged', async (data) => {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data.studioModeEnabled
    previewScene = programScene
  })

  obs.on('SceneListChanged', async (data) => {
    console.log('SceneListChanged', data.scenes.length)
    scenes = data.scenes
  })

  obs.on('SceneCreated', async (data) => {
    console.log('SceneCreated', data)
  })

  obs.on('SceneRemoved', async (data) => {
    console.log('SceneRemoved', data)
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].sceneName === data.sceneName) {
        delete scenes[i]
      }
    }
  })

  obs.on('SceneNameChanged', async (data) => {
    console.log('SceneNameChanged', data)
    for (let i = 0; i < scenes.length; i++) {
      if (scenes[i].sceneName === data.oldSceneName) {
        scenes[i].sceneName = data.sceneName
      }
    }
    // Rename in sceneIcons
    sceneIcons[data.sceneName] = sceneIcons[data.oldSceneName]
  })

  obs.on('CurrentProgramSceneChanged', (data) => {
    console.log('CurrentProgramSceneChanged', data)
    programScene = data.sceneName || ''
  })

  obs.on('CurrentPreviewSceneChanged', async (data) => {
    console.log('CurrentPreviewSceneChanged', data)
    previewScene = data.sceneName
  })

  function sceneClicker (scene) {
    return async function () {
      if (isStudioMode) {
        await sendCommand('SetCurrentPreviewScene', { sceneName: scene.sceneName })
      } else {
        await sendCommand('SetCurrentProgramScene', { sceneName: scene.sceneName })
      }
    }
  }

  function onNameChange (event) {
    sendCommand('SetSceneName', { sceneName: event.target.title, newSceneName: event.target.value })
  }
  function onIconChange (event) {
    sceneIcons[event.target.title] = event.target.value
  }
</script>

<ol
  class:column={editable}
  class:with-icon={buttonStyle === 'icon'}
>
  {#if editable}
    <div class="scene-editor">
      <div class="tabs desktop-only">
        {#each scenes.reverse() as scene, i}
          <button 
            class="tab-button" 
            class:active={activeTab === i}
            on:click={() => activeTab = i}
          >
            Cena {i + 1}
          </button>
        {/each}
      </div>

      <div class="mobile-nav mobile-only">
        <h2 class="mobile-title">Edite uma Cena</h2>
        <div class="nav-buttons">
          <button 
            class="nav-btn prev" 
            on:click={() => activeTab = Math.max(0, activeTab - 1)}
            disabled={activeTab === 0}
          >
            ←
          </button>
          <span class="scene-counter">Cena {activeTab + 1} de {scenes.length}</span>
          <button 
            class="nav-btn next" 
            on:click={() => activeTab = Math.min(scenes.length - 1, activeTab + 1)}
            disabled={activeTab === scenes.length - 1}
          >
            →
          </button>
        </div>
      </div>

      <div class="tab-content">
        {#each scenes.reverse() as scene, i}
          {#if activeTab === i}
            <div class="scene-edit-form">
              <div class="input-group">
                <label class="label">NOME DA CENA</label>
                <input 
                  type="text" 
                  class="input" 
                  title={scene.sceneName} 
                  value={scene.sceneName} 
                  placeholder="Digite o nome da cena"
                  on:change={onNameChange} 
                />
              </div>
              <div class="input-group">
                <label class="label">ÍCONE DA CENA</label>
                <input 
                  type="text" 
                  class="input" 
                  title={scene.sceneName} 
                  value={sceneIcons[scene.sceneName] || ''} 
                  placeholder="URL do ícone ou código de cor (#RRGGBB)"
                  on:change={onIconChange} 
                />
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {:else}
    {#each scenesFiltered as scene}
    <li>
      <SourceButton 
        name={scene.sceneName}
        on:click={sceneClicker(scene)}
        isProgram={programScene === scene.sceneName}
        isPreview={previewScene === scene.sceneName}
        buttonStyle={buttonStyle}
        icon={sceneIcons[scene.sceneName] || `#${Math.floor(Math.random() * 16777215).toString(16)}`}
      />
    </li>
    {/each}
  {/if}
</ol>

<style>
  ol {
    list-style: None;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0 2rem;
    padding: 0;
  }

  @media screen and (min-width: 1024px) {
    ol {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
      padding: 1.5rem;
      background: #202837;
      border-radius: 16px;
      border: 1px solid #2a3446;
    }
  }

  ol.column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0 !important;
    max-width: 960px;
    margin: 0 auto;
  }

  ol.column li {
    background: linear-gradient(145deg, rgba(32, 40, 55, 0.8), rgba(32, 40, 55, 0.95));
    border-radius: 16px;
    border: 1px solid rgba(120, 243, 12, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    position: relative;
    backdrop-filter: blur(10px);
  }

  ol.column li::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background: #78f30c;
    opacity: 0.5;
  }

  .scene-editor {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    background: #202837;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .tabs {
    display: flex;
    overflow-x: auto;
    background: #1a212f;
    padding: 1rem 1rem 0;
    gap: 0.5rem;
    border-bottom: 1px solid #2a3446;
  }

  .tabs::-webkit-scrollbar {
    height: 6px;
  }

  .tabs::-webkit-scrollbar-track {
    background: #1a212f;
  }

  .tabs::-webkit-scrollbar-thumb {
    background: #2a3446;
    border-radius: 3px;
  }

  .tab-button {
    background: transparent;
    border: none;
    color: #8b95a8;
    padding: 0.85rem 1.5rem;
    border-radius: 8px 8px 0 0;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .tab-button:hover {
    color: #78f30c;
    background: #242d3d;
  }

  .tab-button.active {
    color: #78f30c;
    background: #202837;
    border: 1px solid #2a3446;
    border-bottom-color: #202837;
    position: relative;
  }

  .tab-button.active::after {
    display: none;
  }

  .tab-content {
    margin-top: 1rem;
    background: #202837;
  }

  .scene-edit-form {
    width: 100%;
    position: relative;
    padding: 2rem;
    background: #1a212f;
    border-radius: 8px;
    border: 1px solid #2a3446;
  }

  .scene-edit-form::before {
    content: 'CENA';
    position: absolute;
    top: -12px;
    right: 1.5rem;
    background: #78f30c;
    color: #1a212f;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 1px;
  }

  .input-group {
    margin-bottom: 1.5rem;
    position: relative;
  }

  .input-group:last-child {
    margin-bottom: 0;
  }

  .input-group .label {
    display: block;
    color: #78f30c;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input-group .input {
    width: 100%;
    background: #202837 !important;
    border: 1px solid #2a3446 !important;
    border-radius: 6px !important;
    color: white !important;
    padding: 0.75rem 1rem !important;
    font-size: 0.95rem !important;
    transition: all 0.2s ease !important;
  }

  .input-group .input:focus {
    border-color: #78f30c !important;
    box-shadow: 0 0 0 1px #78f30c !important;
    outline: none;
  }

  .input-group .input::placeholder {
    color: #8b95a8 !important;
  }

  @media screen and (max-width: 768px) {
    .tabs {
      padding: 0.75rem 0.75rem 0;
      gap: 0.35rem;
    }

    .tab-button {
      padding: 0.75rem 1.25rem;
      font-size: 0.85rem;
    }



    .scene-edit-form {
      padding: 1.5rem;
    }
  }

  li {
    display: flex;
    min-width: 10rem;
    transition: all 0.3s ease;
  }

  li:hover {
    transform: translateY(-2px);
  }

  ol.with-icon {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    padding: 1rem 0;
  }

  @media screen and (min-width: 1024px) {
    ol.with-icon {
      padding: 2rem;
      gap: 2rem;
    }

    ol.with-icon li {
      position: relative;
    }

    ol.with-icon li::after {
      content: '';
      position: absolute;
      inset: -10px;
      background: rgba(120, 243, 12, 0.1);
      border-radius: 20px;
      opacity: 0;
      transition: all 0.3s ease;
      z-index: -1;
    }

    ol.with-icon li:hover::after {
      opacity: 1;
      inset: -15px;
    }
  }

  ol.with-icon li {
    min-width: 0;
    flex: 0 0 auto;
  }

  /* Estilo para o modo de edição */
  ol.column li {
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  :global(ol.column .label) {
    color: #78f30c;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }

  @media screen and (min-width: 1024px) {
    :global(ol.column .input) {
      background: rgba(32, 40, 55, 0.95) !important;
      border: 2px solid rgba(120, 243, 12, 0.2) !important;
      border-radius: 12px !important;
      color: white !important;
      padding: 0.75rem 1rem !important;
      margin-bottom: 1.5rem !important;
      transition: all 0.3s ease !important;
      font-size: 1.1rem !important;
    }

    :global(ol.column .input:focus) {
      border-color: #78f30c !important;
      box-shadow: 0 0 0 3px rgba(120, 243, 12, 0.2) !important;
      transform: translateY(-1px);
    }

    :global(ol.column .input::placeholder) {
      color: rgba(255, 255, 255, 0.3) !important;
      font-style: italic;
    }

    /* Adiciona ícones indicativos nos campos */
    :global(ol.column .input-group) {
      position: relative;
    }

    :global(ol.column .input-group::before) {
      content: '🎬';
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.5;
      font-size: 1.2rem;
      pointer-events: none;
    }

    :global(ol.column .input-group.icon::before) {
      content: '🎨';
    }
  }

  /* Responsividade */
  @media screen and (max-width: 768px) {
    ol {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
    }

    ol.with-icon {
      padding: 0.5rem 0;
    }
  }

  /* Adiciona uma dica visual para arrastar */
  @media screen and (min-width: 1024px) {
    ol.column li::before {
      content: '⋮⋮';
      position: absolute;
      left: -30px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(120, 243, 12, 0.5);
      font-size: 1.5rem;
      cursor: move;
      opacity: 0;
      transition: all 0.3s ease;
    }

    ol.column li:hover::before {
      opacity: 1;
      left: -35px;
    }
  }

  .desktop-only {
    display: flex;
  }

  .mobile-only {
    display: none;
  }

  @media screen and (max-width: 768px) {
    .desktop-only {
      display: none;
    }

    .mobile-only {
      display: block;
    }

    .mobile-nav {
      background: #1a212f;
      padding: 1rem;
      border-bottom: 1px solid #2a3446;
    }

    .mobile-title {
      color: #78f30c;
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      text-align: center;
    }

    .nav-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .nav-btn {
      background: rgba(120, 243, 12, 0.1);
      border: 1px solid rgba(120, 243, 12, 0.2);
      color: #78f30c;
      width: 44px;
      height: 44px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 24px;
      transition: all 0.2s ease;
    }

    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nav-btn:not(:disabled):hover {
      background: rgba(120, 243, 12, 0.2);
    }

    .nav-btn:not(:disabled):active {
      transform: scale(0.95);
    }

    .scene-counter {
      color: #fff;
      font-size: 0.9rem;
      opacity: 0.8;
      min-width: 120px;
      text-align: center;
    }
  }
</style>
