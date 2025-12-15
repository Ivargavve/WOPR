<script>
  import { onMount } from 'svelte';
  import RetroPanel from './RetroPanel.svelte';
  import RetroButton from './RetroButton.svelte';
  import * as permissions from '$lib/services/permissions.js';

  /** @type {{show: boolean, onclose: () => void}} */
  let { show = false, onclose = () => {} } = $props();

  let screenStatus = $state('checking');
  let micStatus = $state('checking');
  let isCheckingScreen = $state(false);
  let isCheckingMic = $state(false);

  onMount(async () => {
    await checkAllPermissions();
  });

  async function checkAllPermissions() {
    await Promise.all([
      checkScreenPermission(),
      checkMicPermission()
    ]);
  }

  async function checkScreenPermission() {
    isCheckingScreen = true;
    try {
      const works = await permissions.testScreenCapture();
      screenStatus = works ? 'granted' : 'denied';
    } catch (e) {
      console.error('Screen check error:', e);
      screenStatus = 'denied';
    } finally {
      isCheckingScreen = false;
    }
  }

  async function checkMicPermission() {
    isCheckingMic = true;
    try {
      const state = await permissions.checkBrowserMicrophonePermission();
      micStatus = state;
    } catch (e) {
      console.error('Mic check error:', e);
      micStatus = 'unknown';
    } finally {
      isCheckingMic = false;
    }
  }

  async function handleOpenScreenSettings() {
    try {
      await permissions.openScreenRecordingSettings();
    } catch (e) {
      console.error('Failed to open screen settings:', e);
    }
  }

  async function handleRequestMic() {
    isCheckingMic = true;
    try {
      const granted = await permissions.requestMicrophonePermission();
      micStatus = granted ? 'granted' : 'denied';
    } catch (e) {
      console.error('Mic request error:', e);
      micStatus = 'denied';
    } finally {
      isCheckingMic = false;
    }
  }

  async function handleOpenMicSettings() {
    try {
      await permissions.openMicrophoneSettings();
    } catch (e) {
      console.error('Failed to open mic settings:', e);
    }
  }

  /**
   * @param {string} status
   */
  function getStatusIcon(status) {
    switch (status) {
      case 'granted': return '[OK]';
      case 'denied': return '[X]';
      case 'notdetermined': return '[?]';
      case 'checking': return '[..]';
      default: return '[?]';
    }
  }

  /**
   * @param {string} status
   */
  function getStatusClass(status) {
    switch (status) {
      case 'granted': return 'granted';
      case 'denied': return 'denied';
      default: return 'pending';
    }
  }

  const allGranted = $derived(screenStatus === 'granted' && micStatus === 'granted');
</script>

{#if show}
  <div class="permissions-overlay" role="dialog" aria-modal="true">
    <div class="permissions-panel">
      <div class="permissions-header">
        <span class="header-title">[!] PERMISSIONS REQUIRED</span>
      </div>

      <div class="permissions-content">
        <p class="intro-text">
          WOPR needs access to your screen and microphone to function as your AI assistant.
        </p>

        <RetroPanel title="SCREEN RECORDING">
          <div class="permission-row">
            <div class="permission-info">
              <span class="permission-status {getStatusClass(screenStatus)}">
                {getStatusIcon(screenStatus)}
              </span>
              <span class="permission-label">
                {#if screenStatus === 'granted'}
                  Screen capture enabled
                {:else if screenStatus === 'checking'}
                  Checking...
                {:else}
                  Screen capture not allowed
                {/if}
              </span>
            </div>
            {#if screenStatus !== 'granted'}
              <div class="permission-actions">
                <RetroButton
                  label="OPEN SETTINGS"
                  onclick={handleOpenScreenSettings}
                />
                <RetroButton
                  label={isCheckingScreen ? 'CHECKING...' : 'RECHECK'}
                  onclick={checkScreenPermission}
                  disabled={isCheckingScreen}
                />
              </div>
              <p class="permission-hint">
                1. Click "OPEN SETTINGS" to open System Preferences<br>
                2. Find "WOPR" in the list and enable it<br>
                3. Click "RECHECK" to verify
              </p>
            {/if}
          </div>
        </RetroPanel>

        <RetroPanel title="MICROPHONE">
          <div class="permission-row">
            <div class="permission-info">
              <span class="permission-status {getStatusClass(micStatus)}">
                {getStatusIcon(micStatus)}
              </span>
              <span class="permission-label">
                {#if micStatus === 'granted'}
                  Microphone enabled
                {:else if micStatus === 'checking'}
                  Checking...
                {:else if micStatus === 'notdetermined'}
                  Not yet requested
                {:else}
                  Microphone not allowed
                {/if}
              </span>
            </div>
            {#if micStatus !== 'granted'}
              <div class="permission-actions">
                {#if micStatus === 'notdetermined' || micStatus === 'unknown'}
                  <RetroButton
                    label={isCheckingMic ? 'REQUESTING...' : 'ALLOW MIC'}
                    onclick={handleRequestMic}
                    disabled={isCheckingMic}
                    variant="primary"
                  />
                {:else}
                  <RetroButton
                    label="OPEN SETTINGS"
                    onclick={handleOpenMicSettings}
                  />
                {/if}
                <RetroButton
                  label={isCheckingMic ? 'CHECKING...' : 'RECHECK'}
                  onclick={checkMicPermission}
                  disabled={isCheckingMic}
                />
              </div>
              {#if micStatus === 'denied'}
                <p class="permission-hint">
                  1. Click "OPEN SETTINGS" to open System Preferences<br>
                  2. Find "WOPR" in the list and enable it<br>
                  3. Click "RECHECK" to verify
                </p>
              {/if}
            {/if}
          </div>
        </RetroPanel>
      </div>

      <div class="permissions-footer">
        <RetroButton
          label="SKIP FOR NOW"
          onclick={onclose}
        />
        {#if allGranted}
          <RetroButton
            label="CONTINUE"
            onclick={onclose}
            variant="primary"
          />
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .permissions-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 300;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .permissions-panel {
    background: var(--bg-primary);
    border: 2px solid var(--accent-warning);
    box-shadow: 0 0 20px rgba(255, 200, 0, 0.3);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }

  .permissions-header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--accent-warning);
    background: var(--bg-panel);
  }

  .header-title {
    color: var(--accent-warning);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .permissions-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .intro-text {
    color: var(--text-dim);
    font-size: 0.8rem;
    line-height: 1.5;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .permission-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .permission-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .permission-status {
    font-size: 0.875rem;
    font-weight: bold;
  }

  .permission-status.granted {
    color: var(--text-primary);
  }

  .permission-status.denied {
    color: var(--accent-error);
  }

  .permission-status.pending {
    color: var(--accent-warning);
  }

  .permission-label {
    color: var(--text-primary);
    font-size: 0.8rem;
  }

  .permission-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .permission-hint {
    color: var(--text-dim);
    font-size: 0.7rem;
    line-height: 1.6;
    margin: 0;
    padding: 0.5rem;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
  }

  .permissions-footer {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    justify-content: flex-end;
  }
</style>
