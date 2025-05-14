<script>
  /* eslint-env browser */
  const OBS_WEBSOCKET_LATEST_VERSION = '5.0.1' // https://api.github.com/repos/Palakis/obs-websocket/releases/latest

  // Imports
  import { onMount } from 'svelte'
  import {
    mdiSquareRoundedBadge,
    mdiSquareRoundedBadgeOutline,
    mdiImageEdit,
    mdiImageEditOutline,
    mdiFullscreen,
    mdiFullscreenExit,
    mdiBorderVertical,
    mdiArrowSplitHorizontal,
    mdiAccessPoint,
    mdiAccessPointOff,
    mdiRecord,
    mdiStop,
    mdiPause,
    mdiPlayPause,
    mdiConnection,
    mdiCameraOff,
    mdiCamera,
    mdiMotionPlayOutline,
    mdiMotionPlay,
    mdiContentSaveMoveOutline,
    mdiContentSaveCheckOutline,
    mdiClose,
    mdiCog,
    mdiSpeedometer,
    mdiChip,
    mdiInformation,
    mdiEarth,
    mdiKey,
    mdiAlert,
    mdiViewGrid,
    mdiRecordRec,
    mdiResponsive,
    mdiChevronDown,
    mdiChevronUp,
    mdiArrowLeft,
  } from '@mdi/js'
  import Icon from 'mdi-svelte'
  import { compareVersions } from 'compare-versions'

  import './style.scss'
  import { obs, sendCommand } from './obs.js'
  import ProgramPreview from './ProgramPreview.svelte'
  import SceneSwitcher from './SceneSwitcher.svelte'
  import SourceSwitcher from './SourceSwitcher.svelte'
  import ProfileSelect from './ProfileSelect.svelte'
  import SceneCollectionSelect from './SceneCollectionSelect.svelte'

  // State
  let connected = false
  let heartbeat = {}
  let heartbeatInterval
  let isFullScreen = false
  let isStudioMode = false
  let isSceneOnTop = window.localStorage.getItem('isSceneOnTop') === 'true'
  let isVirtualCamActive = false
  let isIconMode = window.localStorage.getItem('isIconMode') === 'true'
  let isReplaying = false
  let editable = false
  let address = ''
  let password = ''
  let scenes = []
  let replayError = ''
  let errorMessage = ''
  let imageFormat = 'jpg'
  let isSaveReplay = false
  let isSaveReplayDisabled = false
  let showMoreOptions = false
  let scenesDropdownVisible = false

  onMount(async () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }

    // Request screen wakelock
    if ('wakeLock' in navigator) {
      try {
        await navigator.wakeLock.request('screen')
        // Re-request when coming back
        document.addEventListener('visibilitychange', async () => {
          if (document.visibilityState === 'visible') {
            await navigator.wakeLock.request('screen')
          }
        })
      } catch (e) {}
    }

    // Toggle the navigation hamburger menu on mobile
    const navbar = document.querySelector('.navbar-burger')
    navbar.addEventListener('click', () => {
      navbar.classList.toggle('is-active')
      document
        .getElementById(navbar.dataset.target)
        .classList.toggle('is-active')
    })

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => {
      isFullScreen = document.fullscreenElement
    })

    document.addEventListener('webkitfullscreenchange', () => {
      isFullScreen = document.webkitFullscreenElement
    })

    document.addEventListener('msfullscreenchange', () => {
      isFullScreen = document.msFullscreenElement
    })

    if (document.location.hash !== '') {
      // Read address from hash
      address = document.location.hash.slice(1)

      // This allows you to add a password in the URL like this:
      // http://obs-web.niek.tv/#ws://localhost:4455#password
      if (address.includes('#')) {
        [address, password] = address.split('#')
      }
      await connect()
    }

    // Export the sendCommand() function to the window object
    window.sendCommand = sendCommand
  })

  $: {
    if (isSceneOnTop) {
      window.localStorage.setItem('isSceneOnTop', 'true')
    } else {
      window.localStorage.removeItem('isSceneOnTop')
    }
  }

  $: {
    if (isIconMode) {
      window.localStorage.setItem('isIconMode', 'true')
    } else {
      window.localStorage.removeItem('isIconMode')
    }
  }

  function formatTime(secs) {
    secs = Math.round(secs / 1000)
    const hours = Math.floor(secs / 3600)
    secs -= hours * 3600
    const mins = Math.floor(secs / 60)
    secs -= mins * 60
    return hours > 0
      ? `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
      : `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  function toggleFullScreen() {
    if (isFullScreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen()
      }
    } else {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen()
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen()
      }
    }
  }

  async function toggleStudioMode() {
    await sendCommand('SetStudioModeEnabled', {
      studioModeEnabled: !isStudioMode
    })
  }

  function setReplayError(message) {
    replayError = message
    setTimeout(() => {
      replayError = ''
    }, 5000)
  }

  async function toggleReplay() {
    const data = await sendCommand('ToggleReplayBuffer')
    console.debug('ToggleReplayBuffer', data.outputActive)
    if (data.outputActive === undefined) {
      setReplayError('Replay buffer is not enabled.')
    } else isReplaying = data.outputActive
  }

  async function saveReplay() {
    const data = await sendCommand('GetReplayBufferStatus')
    console.debug('GetReplayBufferStatus', data.outputActive)
    if (!data.outputActive) {
      setReplayError('Replay buffer is not enabled.')
      return
    }
    await sendCommand('SaveReplayBuffer')
    isSaveReplayDisabled = true
    isSaveReplay = true
    setTimeout(() => {
      isSaveReplay = false
      isSaveReplayDisabled = false
    }, 2500)
  }

  async function switchSceneView() {
    isSceneOnTop = !isSceneOnTop
  }

  async function startStream() {
    await sendCommand('StartStream')
  }

  async function stopStream() {
    await sendCommand('StopStream')
  }

  async function startRecording() {
    await sendCommand('StartRecord')
  }

  async function stopRecording() {
    await sendCommand('StopRecord')
  }

  async function startVirtualCam() {
    await sendCommand('StartVirtualCam')
  }

  async function stopVirtualCam() {
    await sendCommand('StopVirtualCam')
  }

  async function pauseRecording() {
    await sendCommand('PauseRecord')
  }

  async function resumeRecording() {
    await sendCommand('ResumeRecord')
  }

  async function connect() {
    address = address || 'ws://localhost:4455'
    if (address.indexOf('://') === -1) {
      const secure = location.protocol === 'https:' || address.endsWith(':443')
      address = secure ? 'wss://' : 'ws://' + address
    }
    console.log('Connecting to:', address, '- using password:', password)
    await disconnect()
    try {
      const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
        address,
        password
      )
      console.log(
        `Connected to obs-websocket version ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`
      )
    } catch (e) {
      console.log(e)
      errorMessage = e.message
    }
  }

  async function disconnect() {
    await obs.disconnect()
    clearInterval(heartbeatInterval)
    connected = false
    errorMessage = 'Disconnected'
  }

  // OBS events
  obs.on('ConnectionClosed', () => {
    connected = false
    window.history.pushState(
      '',
      document.title,
      window.location.pathname + window.location.search
    ) // Remove the hash
    console.log('Connection closed')
  })

  obs.on('Identified', async () => {
    console.log('Connected')
    connected = true
    document.location.hash = address // For easy bookmarking
    const data = await sendCommand('GetVersion')
    const version = data.obsWebSocketVersion || ''
    console.log('OBS-websocket version:', version)
    if (compareVersions(version, OBS_WEBSOCKET_LATEST_VERSION) < 0) {
      alert(
        'You are running an outdated OBS-websocket (version ' +
          version +
          '), please upgrade to the latest version for full compatibility.'
      )
    }
    if (
      data.supportedImageFormats.includes('webp') &&
      document
        .createElement('canvas')
        .toDataURL('image/webp')
        .indexOf('data:image/webp') === 0
    ) {
      imageFormat = 'webp'
    }
    heartbeatInterval = setInterval(async () => {
      const stats = await sendCommand('GetStats')
      const streaming = await sendCommand('GetStreamStatus')
      const recording = await sendCommand('GetRecordStatus')
      heartbeat = { stats, streaming, recording }
    }, 1000) // Heartbeat
    isStudioMode =
      (await sendCommand('GetStudioModeEnabled')).studioModeEnabled || false
    isVirtualCamActive =
      (await sendCommand('GetVirtualCamStatus')).outputActive || false
  })

  obs.on('ConnectionError', async () => {
    errorMessage = 'Please enter your password:'
    document.getElementById('password').focus()
    if (!password) {
      connected = false
    } else {
      await connect()
    }
  })

  obs.on('VirtualcamStateChanged', async (data) => {
    console.log('VirtualcamStateChanged', data.outputActive)
    isVirtualCamActive = data && data.outputActive
  })

  obs.on('StudioModeStateChanged', async (data) => {
    console.log('StudioModeStateChanged', data.studioModeEnabled)
    isStudioMode = data && data.studioModeEnabled
  })

  obs.on('ReplayBufferStateChanged', async (data) => {
    console.log('ReplayBufferStateChanged', data)
    isReplaying = data && data.outputActive
  })

  // Função para abrir o menu de configurações
  function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('is-active');
    document.getElementById('mobileMenuOverlay').classList.toggle('is-active');
  }

  // Função para toggle do dropdown de cenas
  function toggleScenesDropdown() {
    scenesDropdownVisible = !scenesDropdownVisible;
  }

  // Função para fechar o dropdown
  function closeScenesDropdown() {
    scenesDropdownVisible = false;
  }

  // Função para ir para edição de cenas
  function goToSceneEdit() {
    editable = true;
    closeScenesDropdown();
  }

  // Função para ir para troca de cenas
  function goToSceneSwitch() {
    editable = false;
    closeScenesDropdown();
  }
</script>

<style lang="scss">
  /* Estilos do scrollbar para navegadores WebKit (Chrome, Safari, Edge) */
  :global(*::-webkit-scrollbar) {
    width: 10px;
    height: 10px;
  }

  :global(*::-webkit-scrollbar-track) {
    background: rgba(32, 40, 55, 0.95);
    border-radius: 4px;
  }

  :global(*::-webkit-scrollbar-thumb) {
    background: rgba(120, 243, 12, 0.3);
    border-radius: 4px;
    border: 2px solid rgba(32, 40, 55, 0.95);
  }

  :global(*::-webkit-scrollbar-thumb:hover) {
    background: rgba(120, 243, 12, 0.5);
  }

  /* Estilos do scrollbar para Firefox */
  :global(*) {
    scrollbar-width: thin;
    scrollbar-color: rgba(120, 243, 12, 0.3) rgba(32, 40, 55, 0.95);
  }

  :global(body) {
    background-color: #202837;
    color: white;
    margin: 0;
    padding: 0;
    min-height: 100vh;
  }

  .app-container {
    min-height: 100vh;
    display: flex;
  }

  .main-content {
    flex: 1;
    padding: 1.5rem;
  }

  @media screen and (min-width: 1024px) {
    .main-content {
      margin-left: 300px;
    }
  }

  :global(.navbar) {
    background-color: rgba(32, 40, 55, 0.98) !important;
    backdrop-filter: blur(10px);
    padding: 0.5rem;
    border-bottom: 1px solid rgba(120, 243, 12, 0.1);
    height: 3.5rem;
  }
  .navbar-item {
    display: flex;
    align-items: center;
    gap: 0.50rem;
  }
  .button.is-light.is-small {
    padding: 0 1rem;
    gap: 4px;
}
  :global(.brand-link) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
  }

  :global(.brand-link:hover) {
    background: transparent !important;
  }

  :global(.brand-link:hover .brand-text) {
    color: white;
  }

  :global(.brand-text) {
    font-size: 1.1rem;
    font-weight: 600;
    color: #78f30c;
    transition: color 0.3s ease;
  }
  .icon-naybox {
   margin-right: 0 !important;
   margin-left: 0 !important;
  }
  :global(.navbar-burger) {
    height: 3.5rem;
    width: 3.5rem;
  }

  :global(.navbar-burger span) {
    background-color: #78f30c;
    height: 2px;
    width: 16px;
  }

  :global(.navbar-burger:hover) {
    background-color: rgba(120, 243, 12, 0.1);
  }

  :global(.navbar-menu) {
    background: transparent;
    box-shadow: none;
    padding: 0;
  }

  :global(.navbar-item) {
    color: rgba(255, 255, 255, 0.8);
    padding: 0.5rem 0.75rem;
    transition: all 0.2s ease;
  }

  :global(.navbar-item:hover) {
    background: rgba(120, 243, 12, 0.1) !important;
    color: #78f30c !important;
  }

  :global(.navbar-item .icon) {
    color: #78f30c;
  }

  :global(.performance-stats) {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(120, 243, 12, 0.1);
  }

  :global(.stat) {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
  }

  :global(.stat .value) {
    font-size: 0.95rem;
    font-weight: 600;
    color: #78f30c;
    font-variant-numeric: tabular-nums;
  }

  :global(.stat .label) {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  :global(.button.is-light.is-small) {
    height: 2rem;
    padding: 0 0.75rem;
    background: rgba(120, 243, 12, 0.1) !important;
    border: 1px solid rgba(120, 243, 12, 0.2);
    color: #78f30c !important;
  }

  :global(.button.is-light.is-small:hover) {
    background: rgba(120, 243, 12, 0.15) !important;
    border-color: rgba(120, 243, 12, 0.3);
  }

  @media screen and (max-width: 768px) {
    :global(.navbar-menu) {
      background: rgba(32, 40, 55, 0.98);
      padding: 1rem;
      border-bottom: 1px solid rgba(120, 243, 12, 0.1);
    }

    :global(.navbar-end) {
      gap: 0.5rem;
    }

    :global(.navbar-item) {
      padding: 0.75rem;
      border-radius: 6px;
    }

    :global(.performance-stats) {
      width: 100%;
      justify-content: center;
      margin: 0.5rem 0;
    }
  }

  :global(.mobile-navbar) {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(32, 40, 55, 0.95);
    padding: 0.75rem 0.5rem;
    box-shadow: 0 -2px 20px rgba(120, 243, 12, 0.1);
    z-index: 1000;
    backdrop-filter: blur(10px);
    
    @media screen and (max-width: 768px) {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
  }

  :global(.mobile-navbar .button) {
    flex: 1;
    margin: 0 0.25rem;
    padding: 0.35rem;
    height: auto;
    min-height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: transparent !important;
    border: none;
    position: relative;
    transition: all 0.3s ease;
    overflow: visible;
  }

  :global(.mobile-navbar .button::before) {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 2px;
    background: #78f30c;
    transition: width 0.3s ease;
  }

  :global(.mobile-navbar .button:hover) {
    transform: translateY(-2px);
  }

  :global(.mobile-navbar .button:hover::before) {
    width: 100%;
  }

  :global(.mobile-navbar .button:hover .icon) {
    transform: scale(1.1);
  }

  :global(.mobile-navbar .button:hover .label) {
    letter-spacing: 1px;
  }

  :global(.mobile-navbar .button:active) {
    transform: translateY(1px);
  }

  :global(.mobile-navbar .button .icon) {
    height: 24px;
    width: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
    color: #78f30c;
    transition: all 0.3s ease;
  }

  :global(.mobile-navbar .button.is-light .icon) {
    opacity: 0.7;
  }

  :global(.mobile-navbar .button .label) {
    font-size: 0.65rem;
    line-height: 1;
    color: white;
    font-weight: 500;
    letter-spacing: 0.2px;
    text-transform: uppercase;
    transition: all 0.3s ease;
    position: relative;
  }

  :global(.mobile-navbar .button.is-recording) {
    animation: recordingPulse 2s infinite;
  }

  :global(.mobile-navbar .button.is-recording::before) {
    width: 100%;
    background: #ff3860;
  }

  :global(.mobile-navbar .button.is-recording .icon) {
    color: #ff3860;
    animation: iconPulse 2s infinite;
  }

  :global(.mobile-navbar .button.is-recording .label) {
    color: #ff3860;
  }

  :global(.mobile-navbar .button.is-active::before) {
    width: 100%;
  }

  :global(.mobile-navbar .button.is-active .icon) {
    transform: scale(1.1);
  }

  :global(.mobile-navbar .button.is-active .label) {
    letter-spacing: 1px;
  }

  @keyframes recordingPulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes iconPulse {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      transform: scale(1);
    }
  }

  :global(.duration-badge) {
    position: absolute;
    top: 0px;
    right: 0px;
    background: #78f30c;
    color: #202837;
    border-radius: 12px;
    padding: 2px 6px;
    font-size: 0.6rem;
    font-weight: bold;
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.3s ease;
  }

  :global(.duration-badge.is-visible) {
    opacity: 1;
    transform: scale(1);
  }

  :global(.duration-badge.is-recording) {
    background: #ff3860;
    color: white;
  }

  :global(.mobile-navbar .button.is-light) {
    background-color: rgba(120, 243, 12, 0.2) !important;
    color: #78f30c !important;
  }

  :global(.mobile-navbar .button.is-danger) {
    background-color: rgba(255, 0, 0, 0.2) !important;
    color: #ff0000 !important;
  }

  :global(.mobile-menu) {
    display: none;
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    background-color: #202837;
    padding: 1rem;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
    z-index: 999;
  }

  :global(.mobile-menu.is-active) {
    display: block;
  }

  :global(.main-content) {
    @media screen and (max-width: 768px) {
      padding-bottom: 70px;
    }
  }

  :global(.stream-controls .control-grid) {
    @media screen and (max-width: 768px) {
      display: none;
    }
  }

  :global(.mobile-settings-button) {
    position: relative;
  }

  :global(.mobile-settings-button::after) {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    background-color: #78f30c;
    border-radius: 50%;
    display: none;
  }

  :global(.mobile-settings-button.has-updates::after) {
    display: block;
  }

  :global(.button) {
    background-color: #78f30c !important;
    color: #202837 !important;
    border: none;
    transition: all 0.3s ease;
    margin: 0.25rem;
  }

  :global(.button:hover) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  :global(.button.is-light) {
    background-color: rgba(120, 243, 12, 0.2) !important;
    color: #78f30c !important;
  }

  :global(.control-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  :global(.stream-controls) {
    background-color: rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  :global(.preview-container) {
    background-color: rgba(255,255,255,0.05);
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 2rem;
  }

  :global(.scene-grid) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1rem 0;
  }

  :global(.input) {
    background-color: rgba(255,255,255,0.1) !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    color: white !important;
  }

  :global(.input::placeholder) {
    color: rgba(255,255,255,0.5) !important;
  }

  :global(.footer) {
    background-color: #202837 !important;
    color: white;
    padding: 2rem;
  }

  :global(.footer a) {
    color: #78f30c;
  }

  :global(.mobile-menu) {
    display: none;
    position: fixed;
    bottom: 60px;
    left: 0;
    right: 0;
    background-color: #202837;
    padding: 0;
    box-shadow: 0 -2px 10px rgba(0,0,0,0.2);
    z-index: 999;
    border-top-left-radius: 20px;
    border-top-right-radius: 20px;
    max-height: 80vh;
    overflow-y: auto;
  }

  :global(.mobile-menu-header) {
    padding: 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  :global(.mobile-menu-title) {
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  :global(.mobile-menu-close) {
    background: none;
    border: none;
    color: white;
    padding: 0.5rem;
    cursor: pointer;
  }

  :global(.mobile-menu-section) {
    padding: 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  :global(.mobile-menu-section-title) {
    color: #78f30c;
    font-size: 0.9rem;
    text-transform: uppercase;
    margin-bottom: 1rem;
    letter-spacing: 0.5px;
  }

  :global(.mobile-menu-grid) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  :global(.mobile-menu .button) {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0.75rem;
    font-size: 0.9rem;
    height: auto;
  }

  :global(.mobile-menu .button .icon) {
    margin-right: 0.5rem;
  }

  :global(.mobile-menu .select-controls) {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  :global(.mobile-menu .select-controls :global(select)) {
    width: 100%;
    background-color: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    padding: 0.5rem;
    border-radius: 4px;
  }

  :global(.mobile-menu-overlay) {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.5);
    z-index: 998;
  }

  :global(.mobile-menu-overlay.is-active) {
    display: block;
  }

  :global(.navbar-link) {
    color: white !important;
    background: transparent !important;
    padding: 0.5rem 1rem;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.navbar-link:hover) {
    color: #78f30c !important;
  }

  :global(.navbar-link::after) {
    border-color: #78f30c !important;
  }

  :global(.navbar-dropdown) {
    background: rgba(32, 40, 55, 0.98) !important;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(120, 243, 12, 0.1);
    border-radius: 8px;
    padding: 0.5rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  }

  :global(.navbar-dropdown .navbar-item) {
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.navbar-dropdown .navbar-item:hover) {
    background: rgba(120, 243, 12, 0.1) !important;
    color: #78f30c;
  }

  :global(.navbar-divider) {
    background-color: rgba(120, 243, 12, 0.1);
    margin: 0.5rem 0;
  }

  .stream-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .stream-metrics {
    display: flex;
    gap: 1rem;
    padding: 0.5rem;
    background: rgba(32, 40, 55, 0.95);
    border-radius: 10px;
    border: 1px solid rgba(120, 243, 12, 0.1);
  }

  .metric {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    background: rgba(120, 243, 12, 0.05);
    border-radius: 8px;
    min-width: 120px;
  }

  .metric-icon {
    color: #78f30c;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .metric-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .metric-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: #78f30c;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .metric-label {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
  }

  @media screen and (max-width: 768px) {
    .stream-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .stream-metrics {
      width: 100%;
      justify-content: space-between;
    }

    .metric {
      flex: 1;
      justify-content: center;
    }
  }

  .login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: linear-gradient(135deg, rgba(32, 40, 55, 0.95) 0%, rgba(32, 40, 55, 0.98) 100%);
  }

  .login-box {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 2.5rem;
    width: 100%;
    max-width: 600px;
    border: 1px solid rgba(120, 243, 12, 0.1);
    backdrop-filter: blur(10px);
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-logo {
    width: 80px;
    height: 80px;
    margin-bottom: 1.5rem;
  }

  .login-header .title {
    font-size: 1.75rem;
    margin-bottom: 0.5rem;
  }

  .login-header .subtitle {
    font-size: 1rem;
  }

  .connection-info {
    margin-bottom: 2rem;
  }

  .info-card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: rgba(120, 243, 12, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(120, 243, 12, 0.1);
  }

  .info-icon {
    color: #78f30c;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .info-content h3 {
    color: #78f30c;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .info-content p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .login-form .field {
    margin-bottom: 1.5rem;
  }

  .login-form .label {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .login-form .input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(120, 243, 12, 0.1);
    color: white;
    transition: all 0.3s ease;
  }

  .login-form .input:focus {
    border-color: #78f30c;
    box-shadow: 0 0 0 2px rgba(120, 243, 12, 0.1);
  }

  .login-form .input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .login-form .icon.is-left {
    color: rgba(120, 243, 12, 0.5);
  }

  .login-form .help {
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }

  .connect-button {
    background: #78f30c !important;
    color: #202837 !important;
    font-weight: 600;
    height: 3rem;
    transition: all 0.3s ease;
  }

  .connect-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(120, 243, 12, 0.2);
  }

  .connect-button .icon {
    color: #202837;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1.5rem;
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .feature-item {
    text-align: center;
  }

  .feature-icon {
    color: #78f30c;
    font-size: 1.75rem;
    margin-bottom: 0.75rem;
  }

  .feature-item h4 {
    color: white;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .feature-item p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .notification {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: rgba(255, 86, 48, 0.1);
    border: 1px solid rgba(255, 86, 48, 0.2);
    color: #ff5630;
  }

  .notification .icon {
    color: #ff5630;
  }

  @media screen and (max-width: 768px) {
    .login-container {
      padding: 1rem;
    }

    .login-box {
      padding: 1.5rem;
    }

    .features-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Ajustando os estilos para a navbar lateral */
  .desktop-sidebar {
    display: none;
    position: fixed;
    left: 0;
    top: 3.5rem;
    bottom: 0;
    width: 300px;
    background: rgba(32, 40, 55, 0.98);
    border-right: 1px solid rgba(120, 243, 12, 0.1);
    padding: 1.5rem;
    backdrop-filter: blur(10px);
    overflow-y: auto;
  }

  .desktop-sidebar .stream-controls {
    background: none;
    padding: 0;
    margin: 0;
  }

  .desktop-sidebar .control-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
  }

  .desktop-sidebar .button {
    width: 100%;
    justify-content: flex-start;
    margin: 0;
  }

  .desktop-sidebar .select-controls {
    margin-top: 1rem;
  }

  .desktop-sidebar .select-controls select {
    width: 100%;
    margin-bottom: 0.5rem;
  }

  @media screen and (min-width: 1024px) {
    .desktop-sidebar {
      display: block;
    }

    .main-content {
      margin-left: 300px;
    }

    /* Esconde o stream-controls original em desktop */
    .main-content .stream-controls {
      display: none;
    }
  }

  .sidebar-section {
    margin-bottom: 2rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid rgba(120, 243, 12, 0.1);
  }

  .sidebar-section:last-child {
    border-bottom: none;
  }

  .sidebar-title {
    color: #78f30c;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(120, 243, 12, 0.1);
  }

  .sidebar-metrics {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sidebar-metric {
    background: rgba(120, 243, 12, 0.05);
    border: 1px solid rgba(120, 243, 12, 0.1);
    border-radius: 8px;
    padding: 1rem;
  }

  .metric-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .metric-icon {
    color: #78f30c;
    width: 24px;
    height: 24px;
  }

  .metric-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .metric-value {
    color: #78f30c;
    font-size: 2rem;
    font-weight: 600;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .metric-unit {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1rem;
    margin-left: 0.25rem;
  }

  /* Estilos para as opções extras */
  .extra-options {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-in-out;
  }

  .extra-options.is-visible {
    max-height: 1000px;
  }

  .show-more-button {
    width: 100%;
    background: rgba(120, 243, 12, 0.1) !important;
    border: 1px solid rgba(120, 243, 12, 0.2);
    color: #78f30c !important;
    padding: 0.5rem;
    margin-top: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: all 0.3s ease;
  }

  .show-more-button:hover {
    background: rgba(120, 243, 12, 0.15) !important;
    border-color: rgba(120, 243, 12, 0.3);
  }

  .desktop-sidebar .control-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .desktop-sidebar .primary-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  /* Estilo para o botão de voltar */
  .back-button {
    position: fixed;
    top: 4.5rem;
    right: 1.5rem;
    z-index: 100;
    background: #78f30c !important;
    border: 2px solid rgba(255, 255, 255, 0.2);
    color: #202837 !important;
    padding: 0.75rem 1.25rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
    font-size: 1.1rem;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(120, 243, 12, 0.3);
    animation: pulseButton 2s infinite;
  }

  .back-button:hover {
    background: #8ff31d !important;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 20px rgba(120, 243, 12, 0.4);
  }

  .back-button .icon {
    font-size: 1.5rem;
  }

  .back-button::after {
    content: "Clique aqui para voltar";
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(32, 40, 55, 0.9);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.85rem;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.3s ease;
    pointer-events: none;
  }

  .back-button:hover::after {
    opacity: 1;
    bottom: -40px;
  }

  @keyframes pulseButton {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }

  @media screen and (max-width: 768px) {
    .back-button {
      top: auto;
      bottom: 5.5rem;
      right: 1rem;
      padding: 0.85rem 1.5rem;
      border-radius: 15px;
      font-size: 1.2rem;
    }

    .back-button::after {
      content: "↑ Toque para voltar ↑";
      bottom: -35px;
    }

    .back-button:hover::after {
      bottom: -45px;
    }
  }

  /* Container do botão de cenas */
  .scenes-button-container {
    position: relative;
    flex: 1;
  }

  /* Estilo do dropdown de cenas */
  .scenes-dropdown {
    position: fixed;
    bottom: 70px;
    left: 0;
    right: 0;
    background: #202837;
    border-top: 1px solid #2a3446;
    padding: 1rem;
    z-index: 1000;
  }

  .scenes-dropdown .button {
    width: 100%;
    justify-content: flex-start;
    background: #1a212f !important;
    border: 1px solid #2a3446;
    padding: 1rem;
    margin-bottom: 0.75rem;
    border-radius: 8px;
    color: white !important;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
  }

  .scenes-dropdown .button:last-child {
    margin-bottom: 0;
  }

  .scenes-dropdown .button .icon {
    margin-right: 0.75rem;
  }

  /* Overlay do dropdown */
  .scenes-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
</style>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
</svelte:head>

<nav class="navbar" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item brand-link" href="/">
      <img src="favicon.png" alt="OBS-web" class="rotate" />
      <span class="brand-text">OBS Web</span>
    </a>

    <button
      class="navbar-burger"
      aria-label="menu"
      aria-expanded="false"
      data-target="navmenu"
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>
  </div>

  <div id="navmenu" class="navbar-menu">
    {#if connected}
    <div class="navbar-end">
      <div class="navbar-item">
          <div class="performance-stats">
            <div class="stat">
              <span class="value">{heartbeat?.stats ? Math.round(heartbeat.stats.activeFps) : '--'}</span>
              <span class="label">FPS</span>
            </div>
            <div class="stat">
              <span class="value">{heartbeat?.stats ? Math.round(heartbeat.stats.cpuUsage) : '--'}%</span>
              <span class="label">CPU</span>
            </div>
          </div>
        </div>

        <a class="navbar-item" on:click={() => (isIconMode = !isIconMode)}>
          <span class="icon">
            <Icon path={isIconMode ? mdiSquareRoundedBadgeOutline : mdiSquareRoundedBadge} />
          </span>
          <span>Modo Ícone</span>
        </a>

        <a class="navbar-item" on:click={switchSceneView}>
          <span class="icon">
            <Icon path={mdiArrowSplitHorizontal} />
          </span>
          <span>Layout</span>
        </a>

        <a class="navbar-item" on:click={toggleFullScreen}>
          <span class="icon">
            <Icon path={isFullScreen ? mdiFullscreenExit : mdiFullscreen} />
          </span>
          <span>Tela Cheia</span>
        </a>

        <div class="navbar-item">
          <button class="button is-light is-small" on:click={disconnect}>
            <span class="icon">
              <Icon path={mdiConnection} />
            </span>
            <span>Desconectar</span>
          </button>
        </div>
      </div>
    {/if}
  </div>
</nav>

<div class="app-container">
          {#if connected}
    <!-- Navbar lateral para desktop -->
    <div class="desktop-sidebar">
      <div class="sidebar-section">
        <h2 class="sidebar-title">Análise de Desempenho</h2>
        <div class="sidebar-metrics">
              {#if heartbeat && heartbeat.stats}
            <div class="sidebar-metric">
              <div class="metric-header">
                <span class="metric-icon">
                  <Icon path={mdiSpeedometer} />
                </span>
                <span class="metric-label">FPS</span>
              </div>
              <div class="metric-value">
                {Math.round(heartbeat.stats.activeFps)}
              </div>
            </div>
            <div class="sidebar-metric">
              <div class="metric-header">
                <span class="metric-icon">
                  <Icon path={mdiChip} />
                </span>
                <span class="metric-label">CPU</span>
              </div>
              <div class="metric-value">
                {Math.round(heartbeat.stats.cpuUsage)}
                <span class="metric-unit">%</span>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="sidebar-section">
        <h2 class="sidebar-title">Controles de Stream</h2>
        <div class="control-grid">
          <!-- Controles Principais -->
          <div class="primary-controls">
            <!-- Stream -->
            {#if heartbeat && heartbeat.streaming && heartbeat.streaming.outputActive}
              <button class="button" on:click={stopStream} title="Parar Stream">
                <span class="icon"><Icon path={mdiAccessPointOff} /></span>
                <span>{formatTime(heartbeat.streaming.outputDuration)}</span>
              </button>
            {:else}
              <button class="button is-light" on:click={startStream} title="Iniciar Stream">
                <span class="icon"><Icon path={mdiAccessPoint} /></span>
                <span>Iniciar Stream</span>
              </button>
            {/if}

            <!-- Gravação -->
            {#if heartbeat && heartbeat.recording && heartbeat.recording.outputActive}
              <button class="button" on:click={stopRecording} title="Parar Gravação">
                <span class="icon"><Icon path={mdiStop} /></span>
                <span>{formatTime(heartbeat.recording.outputDuration)}</span>
              </button>
            {:else}
              <button class="button is-light" on:click={startRecording} title="Iniciar Gravação">
                <span class="icon"><Icon path={mdiRecord} /></span>
                <span>Gravar</span>
              </button>
            {/if}

            <!-- Câmera Virtual -->
            {#if isVirtualCamActive}
              <button class="button" on:click={stopVirtualCam} title="Parar Câmera Virtual">
                <span class="icon"><Icon path={mdiCameraOff} /></span>
                <span>Parar Câmera</span>
              </button>
            {:else}
              <button class="button is-light" on:click={startVirtualCam} title="Iniciar Câmera Virtual">
                <span class="icon"><Icon path={mdiCamera} /></span>
                <span>Câmera Virtual</span>
              </button>
            {/if}

            <!-- Estúdio -->
            <button class:is-light={!isStudioMode} class="button" on:click={toggleStudioMode} title="Estúdio">
              <span class="icon"><Icon path={mdiBorderVertical} /></span>
              <span>Estúdio</span>
            </button>
          </div>

          <!-- Botão Ver Mais -->
            <button
            class="show-more-button"
            on:click={() => showMoreOptions = !showMoreOptions}
            >
            <span>{showMoreOptions ? 'Ver Menos' : 'Ver Mais'}</span>
              <span class="icon">
              <Icon path={showMoreOptions ? mdiChevronUp : mdiChevronDown} />
              </span>
            </button>

          <!-- Opções Extras -->
          <div class="extra-options" class:is-visible={showMoreOptions}>
            <!-- Replay -->
            <button
              class:is-light={!isReplaying}
              class="button"
              class:is-danger={replayError}
              title="Alternar Buffer de Replay"
              on:click={toggleReplay}
            >
              <span class="icon">
                <Icon path={isReplaying ? mdiMotionPlayOutline : mdiMotionPlay} />
              </span>
              <span>Replay {isReplaying ? 'Ativo' : 'Inativo'}</span>
              {#if replayError}<span class="has-text-danger">{replayError}</span>{/if}
            </button>

            <!-- Salvar Replay -->
            <button
              class:is-light={!isSaveReplay}
              class="button"
              title="Salvar Buffer de Replay"
              on:click={() => {
                if (!isSaveReplayDisabled) {
                  saveReplay()
                }
              }}
              disabled={isSaveReplayDisabled}
            >
              <span class="icon">
                <Icon path={isSaveReplay ? mdiContentSaveCheckOutline : mdiContentSaveMoveOutline} />
              </span>
              <span>Salvar Replay</span>
            </button>

            <!-- Layout -->
            <button class:is-light={!isSceneOnTop} class="button" on:click={switchSceneView} title="Cenas embaixo">
              <span class="icon"><Icon path={mdiArrowSplitHorizontal} /></span>
              <span>Cenas embaixo</span>
            </button>

            <!-- Editar Cenas -->
            <button class:is-light={!editable} class="button" title="Editar Cenas" on:click={() => (editable = !editable)}>
              <span class="icon">
                <Icon path={editable ? mdiImageEditOutline : mdiImageEdit} />
              </span>
              <span>Editar Cenas</span>
            </button>

            <!-- Modo Ícone -->
            <button class:is-light={!isIconMode} class="button" title="Mostrar como Ícones" on:click={() => (isIconMode = !isIconMode)}>
              <span class="icon">
                <Icon path={isIconMode ? mdiSquareRoundedBadgeOutline : mdiSquareRoundedBadge} />
              </span>
              <span>Modo Ícone</span>
            </button>

            <!-- Tela Cheia -->
            <button class="button" on:click={toggleFullScreen} title="Tela Cheia">
            <span class="icon">
              <Icon path={isFullScreen ? mdiFullscreenExit : mdiFullscreen} />
            </span>
              <span>Tela Cheia</span>
          </button>

            <!-- Seletores -->
            <div class="select-controls">
              <ProfileSelect />
              <SceneCollectionSelect />
        </div>

            <!-- Desconectar -->
            <button class="button is-light" on:click={disconnect} title="Desconectar">
              <span class="icon"><Icon path={mdiConnection} /></span>
              <span>Desconectar</span>
            </button>
      </div>
    </div>
  </div>
    </div>

    <!-- Conteúdo principal -->
    <div class="main-content">
      <div class="preview-container">
      {#if isSceneOnTop}
        <ProgramPreview {imageFormat} />
      {/if}
      <SceneSwitcher
        bind:scenes
        buttonStyle={isIconMode ? 'icon' : 'text'}
        {editable}
      />
      {#if !isSceneOnTop}
        <ProgramPreview {imageFormat} />
      {/if}
      </div>
    </div>

    <!-- Navbar Mobile -->
    <div class="mobile-navbar">
      {#if heartbeat && heartbeat.streaming && heartbeat.streaming.outputActive}
        <button class="button is-recording" on:click={stopStream} title="Parar Stream">
          <span class="icon icon-naybox"><Icon path={mdiAccessPointOff} /></span>
          <span class="label">Ao Vivo</span>
          <span class="duration-badge is-visible is-recording">
            {formatTime(heartbeat.streaming.outputDuration)}
          </span>
        </button>
      {:else}
        <button class="button is-light" on:click={startStream} title="Iniciar Stream">
          <span class="icon icon-naybox"><Icon path={mdiAccessPoint} /></span>
          <span class="label">Iniciar Live</span>
        </button>
        {/if}

      {#if heartbeat && heartbeat.recording && heartbeat.recording.outputActive}
        <button class="button is-recording" on:click={stopRecording} title="Parar Gravação">
          <span class="icon icon-naybox"><Icon path={mdiStop} /></span>
          <span class="label">Gravando</span>
          <span class="duration-badge is-visible is-recording">
            {formatTime(heartbeat.recording.outputDuration)}
          </span>
        </button>
    {:else}
        <button class="button is-light" on:click={startRecording} title="Iniciar Gravação">
          <span class="icon icon-naybox"><Icon path={mdiRecord} /></span>
          <span class="label">Gravar</span>
        </button>
      {/if}

      <!-- Botão de Cenas -->
      <button 
        class="button is-light"
        on:click={toggleScenesDropdown}
        title="Cenas"
      >
        <span class="icon icon-naybox"><Icon path={mdiViewGrid} /></span>
        <span class="label">Cenas</span>
      </button>

      <!-- Overlay do dropdown -->
      {#if scenesDropdownVisible}
        <div 
          class="scenes-overlay"
          on:click={closeScenesDropdown}
        ></div>
      {/if}

      <!-- Dropdown de Cenas -->
      {#if scenesDropdownVisible}
        <div class="scenes-dropdown">
          <button 
            class="button"
            on:click={goToSceneEdit}
          >
            <span class="icon">
              <Icon path={mdiImageEdit} />
            </span>
            <span>Editar Cenas</span>
          </button>

          <button 
            class="button"
            on:click={goToSceneSwitch}
          >
            <span class="icon">
              <Icon path={mdiViewGrid} />
            </span>
            <span>Trocar Cenas</span>
          </button>
        </div>
      {/if}

      <button 
        class="button mobile-settings-button"
        class:is-light={!isVirtualCamActive && !isReplaying}
        class:is-active={isVirtualCamActive || isReplaying}
        on:click={toggleMobileMenu}
        title="Configurações"
      >
        <span class="icon icon-naybox"><Icon path={mdiCog} /></span>
        <span class="label">Configs</span>
        {#if isVirtualCamActive || isReplaying}
          <span class="duration-badge is-visible">
            {#if isVirtualCamActive && isReplaying}2{:else}1{/if}
          </span>
        {/if}
      </button>
        </div>

    <!-- Menu Mobile de Configurações -->
    <div id="mobileMenuOverlay" class="mobile-menu-overlay" on:click={() => {
      document.getElementById('mobileMenu').classList.remove('is-active');
      document.getElementById('mobileMenuOverlay').classList.remove('is-active');
    }}></div>

    <div id="mobileMenu" class="mobile-menu">
      <div class="mobile-menu-header">
        <h3 class="mobile-menu-title">Configurações</h3>
        <button 
          class="mobile-menu-close"
          on:click={() => {
            document.getElementById('mobileMenu').classList.remove('is-active');
            document.getElementById('mobileMenuOverlay').classList.remove('is-active');
          }}
        >
          <span class="icon">
            <Icon path={mdiClose} />
          </span>
        </button>
      </div>

      <div class="mobile-menu-section">
        <h4 class="mobile-menu-section-title">Dispositivos</h4>
        <div class="mobile-menu-grid">
          <!-- Câmera Virtual -->
          {#if isVirtualCamActive}
            <button class="button" on:click={stopVirtualCam}>
              <span class="icon"><Icon path={mdiCameraOff} /></span>
              <span>Parar Câmera</span>
            </button>
          {:else}
            <button class="button is-light" on:click={startVirtualCam}>
              <span class="icon"><Icon path={mdiCamera} /></span>
              <span>Câmera Virtual</span>
            </button>
      {/if}

          <!-- Replay -->
          <button 
            class:is-light={!isReplaying}
            class="button"
            class:is-danger={replayError}
            on:click={toggleReplay}
          >
            <span class="icon">
              <Icon path={isReplaying ? mdiMotionPlayOutline : mdiMotionPlay} />
            </span>
            <span>Replay {isReplaying ? 'Ativo' : ''}</span>
          </button>

          <!-- Salvar Replay -->
          <button 
            class:is-light={!isSaveReplay}
            class="button"
            disabled={isSaveReplayDisabled}
            on:click={() => {
              if (!isSaveReplayDisabled) {
                saveReplay()
              }
            }}
          >
            <span class="icon">
              <Icon path={isSaveReplay ? mdiContentSaveCheckOutline : mdiContentSaveMoveOutline} />
            </span>
            <span>Salvar Replay</span>
          </button>
        </div>
      </div>

      <div class="mobile-menu-section">
        <h4 class="mobile-menu-section-title">Layout</h4>
        <div class="mobile-menu-grid">
          <button class:is-light={!isSceneOnTop} class="button" on:click={switchSceneView}>
            <span class="icon"><Icon path={mdiArrowSplitHorizontal} /></span>
            <span>Cenas no Topo</span>
          </button>

          <button class:is-light={!isIconMode} class="button" on:click={() => (isIconMode = !isIconMode)}>
            <span class="icon">
              <Icon path={isIconMode ? mdiSquareRoundedBadgeOutline : mdiSquareRoundedBadge} />
            </span>
            <span>Modo Ícone</span>
          </button>

          <button class:is-light={!editable} class="button" on:click={() => (editable = !editable)}>
            <span class="icon">
              <Icon path={editable ? mdiImageEditOutline : mdiImageEdit} />
            </span>
            <span>Editar Cenas</span>
          </button>
        </div>
      </div>

      <div class="mobile-menu-section">
        <h4 class="mobile-menu-section-title">Perfis e Coleções</h4>
        <div class="select-controls">
          <ProfileSelect />
          <SceneCollectionSelect />
        </div>
      </div>

      <div class="mobile-menu-section">
        <h4 class="mobile-menu-section-title">Sessão</h4>
        <button class="button is-light" on:click={disconnect}>
          <span class="icon"><Icon path={mdiConnection} /></span>
          <span>Desconectar</span>
        </button>
      </div>
    </div>

    <!-- Botão de voltar quando estiver no modo de edição -->
    {#if editable}
      <button class="back-button" on:click={() => editable = false}>
        <span class="icon">
          <Icon path={mdiArrowLeft} />
        </span>
        <span>Voltar para a Troca de Cenas</span>
      </button>
    {/if}
  {:else}
    <!-- Página de login -->
    <div class="main-content">
      <div class="login-container">
        <div class="login-box">
          <div class="login-header">
            <img src="favicon.png" alt="OBS-web" class="login-logo rotate" />
            <h1 class="title has-text-white">Bem-vindo ao OBS Web</h1>
            <p class=" has-text-grey-light">Controle seu OBS Studio direto do navegador</p>
          </div>

          <div class="connection-info">
            <div class="info-card">
              <span class="icon info-icon">
                <Icon path={mdiInformation} />
              </span>
              <div class="info-content">
                <h3>Como Conectar</h3>
                <p>1. Instale o plugin obs-websocket no OBS Studio</p>
                <p>2. Configure uma senha no plugin</p>
                <p>3. Use o endereço padrão ou personalize abaixo</p>
                <p>Ou siga nossos tutoriais NayBox <a href="https://naybox.live/tutorial/NayBox.pdf" style="color: #78f30c; text-decoration: underline;">Clique aqui para ver os tutoriais</a></p>
              </div>
            </div>
          </div>

          <form on:submit|preventDefault={connect} class="login-form">
            <div class="field">
              <label class="label has-text-white">Endereço do OBS</label>
              <div class="control has-icons-left">
            <input
              id="host"
              bind:value={address}
              class="input"
              type="text"
              placeholder="ws://localhost:4455"
            />
                <span class="icon is-small is-left">
                  <Icon path={mdiEarth} />
                </span>
              </div>
              <p class="help has-text-grey-light">Endereço do servidor websocket do OBS</p>
            </div>

            <div class="field">
              <label class="label has-text-white">Senha</label>
              <div class="control has-icons-left">
            <input
              id="password"
              bind:value={password}
              class="input"
              type="password"
                  placeholder="Deixe em branco se a autenticação estiver desativada"
            />
                <span class="icon is-small is-left">
                  <Icon path={mdiKey} />
                </span>
        </div>
              <p class="help has-text-grey-light">Senha configurada no plugin obs-websocket</p>
            </div>

            <div class="field">
              <div class="control">
                <button class="button is-fullwidth connect-button">
                  <span class="icon">
                    <Icon path={mdiConnection} />
                  </span>
                  <span>Conectar ao OBS</span>
                </button>
              </div>
            </div>

            {#if errorMessage}
              <div class="notification is-danger is-light">
                <span class="icon">
                  <Icon path={mdiAlert} />
                </span>
                <span>{errorMessage}</span>
              </div>
            {/if}
      </form>

          <div class="features-grid">
            <div class="feature-item">
              <span class="icon feature-icon">
                <Icon path={mdiSpeedometer} />
              </span>
              <h4>Performance</h4>
              <p>Monitore FPS e uso de CPU</p>
            </div>
            <div class="feature-item">
              <span class="icon feature-icon">
                <Icon path={mdiViewGrid} />
              </span>
              <h4>Cenas</h4>
              <p>Gerencie suas cenas facilmente</p>
            </div>
            <div class="feature-item">
              <span class="icon feature-icon">
                <Icon path={mdiRecordRec} />
              </span>
              <h4>Controles</h4>
              <p>Stream e gravação com um clique</p>
            </div>
            <div class="feature-item">
              <span class="icon feature-icon">
                <Icon path={mdiResponsive} />
              </span>
              <h4>Responsivo</h4>
              <p>Interface adaptativa para todos dispositivos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/if}
  </div>

<footer class="footer">
  <div class="content has-text-centered">
    <p>
      <strong class="has-text-white">OBS-web</strong>
      por
      <a href="https://niekvandermaas.nl/">Niek van der Maas</a>
    </p>
  </div>
</footer>
