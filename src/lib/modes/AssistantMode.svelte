<script>
  import { RetroPanel } from '$lib/components';

  let messages = $state([
    { type: 'system', text: 'Awaiting context...' },
    { type: 'hint', text: 'Say "Joshua" to ask me anything' }
  ]);
</script>

<div class="assistant-mode">
  <RetroPanel title="JOSHUA">
    <div class="message-area">
      {#each messages as message}
        <p class="message" class:system={message.type === 'system'} class:hint={message.type === 'hint'}>
          > {message.text}
        </p>
      {/each}
      <span class="cursor">█</span>
    </div>
  </RetroPanel>

  <RetroPanel title="CONTEXT" border="single">
    <div class="context-info">
      <div class="context-row">
        <span class="context-label">DETECTED:</span>
        <span class="context-value">No active application</span>
      </div>
      <div class="context-row">
        <span class="context-label">MODE:</span>
        <span class="context-value">PASSIVE OBSERVATION</span>
      </div>
    </div>
  </RetroPanel>
</div>

<style>
  .assistant-mode {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .message-area {
    min-height: 150px;
  }

  .message {
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .message.system {
    color: var(--text-primary);
  }

  .message.hint {
    color: var(--text-dim);
  }

  .cursor {
    animation: blink 1s step-end infinite;
    color: var(--text-primary);
  }

  @keyframes blink {
    50% { opacity: 0; }
  }

  .context-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .context-row {
    display: flex;
    gap: 0.5rem;
  }

  .context-label {
    color: var(--text-dim);
    min-width: 80px;
    font-size: 0.75rem;
  }

  .context-value {
    color: var(--text-primary);
    font-size: 0.75rem;
  }
</style>
