<script lang="ts">
  import type { Email, Config } from '../lib/types'
  import { api } from '../lib/api'
  import Icon from './Icon.svelte'

  type Props = {
    email: Email
    config: Config
    onClose: () => void
  }
  let { email, config, onClose }: Props = $props()

  // Same regex as the legacy AngularJS controller (app/scripts/controllers/item.js:128).
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

  const RELAY_TO_KEY = 'maildevRelayTo'
  const initialTo = (() => {
    try { return localStorage.getItem(RELAY_TO_KEY) ?? '' } catch { return '' }
  })()

  let mode = $state<'choose' | 'override' | 'sending' | 'done' | 'error'>('choose')
  let to = $state(initialTo)
  let validationError = $state<string | null>(null)
  let sendError = $state<string | null>(null)

  const defaultRecipients = $derived(
    email.to?.map((a) => a.address).filter(Boolean).join(', ') || ''
  )

  async function send(target?: string) {
    mode = 'sending'
    sendError = null
    try {
      await api.relay(email.id, target)
      mode = 'done'
    } catch (err) {
      sendError = err instanceof Error ? err.message : 'Relay failed'
      mode = 'error'
    }
  }

  function relayDefault() { void send() }

  function openOverride() {
    validationError = null
    mode = 'override'
  }

  function submitOverride() {
    const trimmed = to.trim()
    if (!emailRegex.test(trimmed)) {
      validationError = 'The specified email address is not correct.'
      return
    }
    try { localStorage.setItem(RELAY_TO_KEY, trimmed) } catch { /* ignore */ }
    void send(trimmed)
  }

  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && mode !== 'sending') onClose()
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
  role="presentation"
  onclick={onBackdrop}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="relay-title"
    class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl dark:bg-slate-800 dark:text-slate-100"
  >
    <div class="mb-3 flex items-center justify-between">
      <h2 id="relay-title" class="text-base font-semibold">Relay email</h2>
      <button
        type="button"
        onclick={onClose}
        class="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label="Close"
      >
        <Icon name="x" />
      </button>
    </div>

    {#if mode === 'choose'}
      <p class="text-sm text-slate-600 dark:text-slate-300">
        Send this email through <span class="font-mono">{config.outgoingHost ?? 'the configured relay'}</span>.
      </p>
      <dl class="mt-3 space-y-1 text-sm">
        <div class="flex gap-2">
          <dt class="w-20 shrink-0 text-slate-500 dark:text-slate-400">Subject</dt>
          <dd class="truncate">{email.subject}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="w-20 shrink-0 text-slate-500 dark:text-slate-400">Recipients</dt>
          <dd class="truncate font-mono text-xs">{defaultRecipients || '(none)'}</dd>
        </div>
      </dl>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onclick={openOverride}
          class="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Relay to…
        </button>
        <button
          type="button"
          onclick={relayDefault}
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Icon name="send" />
          Send
        </button>
      </div>
    {:else if mode === 'override'}
      <label for="relay-to" class="text-sm text-slate-600 dark:text-slate-300">Send to</label>
      <input
        id="relay-to"
        type="email"
        bind:value={to}
        class="mt-1 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        placeholder="user@example.com"
        autocomplete="email"
      />
      {#if validationError}
        <p class="mt-1 text-xs text-rose-600 dark:text-rose-400">{validationError}</p>
      {/if}
      <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Will be sent through <span class="font-mono">{config.outgoingHost ?? '(configured relay)'}</span>.
      </p>
      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onclick={onClose}
          class="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
        >Cancel</button>
        <button
          type="button"
          onclick={submitOverride}
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Icon name="send" />
          Send
        </button>
      </div>
    {:else if mode === 'sending'}
      <p class="text-sm text-slate-600 dark:text-slate-300">Relaying…</p>
    {:else if mode === 'done'}
      <p class="text-sm text-emerald-600 dark:text-emerald-400">Relay successful.</p>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          onclick={onClose}
          class="rounded-md bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
        >Close</button>
      </div>
    {:else if mode === 'error'}
      <p class="text-sm text-rose-600 dark:text-rose-400">Relay failed: {sendError}</p>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          onclick={onClose}
          class="rounded-md bg-slate-100 px-3 py-1.5 text-sm hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
        >Close</button>
      </div>
    {/if}
  </div>
</div>
