<script>
  /**
   * RetroInput - Text input with terminal styling
   *
   * @prop {string} value - Input value
   * @prop {string} placeholder - Placeholder text
   * @prop {string} label - Optional label
   * @prop {'text' | 'password' | 'number'} type - Input type
   * @prop {boolean} disabled - Whether input is disabled
   * @prop {(value: string) => void} oninput - Input handler
   */
  let {
    value = $bindable(''),
    placeholder = '',
    label = '',
    type = 'text',
    disabled = false,
    oninput = () => {}
  } = $props();

  /** @param {Event} e */
  function handleInput(e) {
    value = /** @type {HTMLInputElement} */ (e.target).value;
    oninput(value);
  }
</script>

<div class="retro-input-wrapper">
  {#if label}
    <label class="input-label" for="retro-input">{label}</label>
  {/if}
  <div class="input-container">
    <span class="input-prompt">&gt;</span>
    <input
      id="retro-input"
      class="retro-input"
      {type}
      {placeholder}
      {disabled}
      {value}
      oninput={handleInput}
    />
    <span class="input-cursor"></span>
  </div>
</div>

<style>
  .retro-input-wrapper {
    width: 100%;
  }

  .input-label {
    display: block;
    color: var(--text-dim);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }

  .input-container {
    display: flex;
    align-items: center;
    background: var(--bg-panel);
    border: 1px solid var(--border-color);
    padding: 0.75rem;
    gap: 0.5rem;
    transition: border-color 0.2s ease;
  }

  .input-container:focus-within {
    border-color: var(--text-primary);
    box-shadow: var(--glow-green);
  }

  .input-prompt {
    color: var(--text-primary);
    font-weight: bold;
    flex-shrink: 0;
  }

  .retro-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    outline: none;
    min-width: 0;
  }

  .retro-input::placeholder {
    color: var(--text-dim);
    opacity: 0.6;
  }

  .retro-input:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .input-cursor {
    width: 8px;
    height: 1.2em;
    background: var(--text-primary);
    animation: blink 1s step-end infinite;
    flex-shrink: 0;
    opacity: 0;
  }

  .input-container:focus-within .input-cursor {
    opacity: 1;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
</style>
