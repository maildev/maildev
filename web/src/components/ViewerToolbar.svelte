<script lang="ts">
  import Icon from './Icon.svelte'
  import ViewportSelector from './ViewportSelector.svelte'
  import type { Email, Config } from '../lib/types'
  import { api } from '../lib/api'

  export type Panel = 'html' | 'plain' | 'attachments' | 'headers' | 'source'

  type Props = {
    email: Email
    config: Config | null
    panel: Panel
    width: string | null
    onPanelChange: (p: Panel) => void
    onWidthChange: (w: string | null) => void
    onRelay: () => void
    onDelete: () => void
  }
  let {
    email,
    config,
    panel,
    width,
    onPanelChange,
    onWidthChange,
    onRelay,
    onDelete,
  }: Props = $props()

  type PanelOption = {
    value: Panel
    label: string
    icon: 'file-code' | 'file-text' | 'paperclip' | 'list' | 'code'
    disabled: boolean
  }

  const panelOptions = $derived<PanelOption[]>([
    { value: 'html',        label: 'HTML',        icon: 'file-code', disabled: !email.html },
    { value: 'plain',       label: 'Text',        icon: 'file-text', disabled: !email.text },
    { value: 'attachments', label: 'Attachments', icon: 'paperclip', disabled: !email.attachments?.length },
    { value: 'headers',     label: 'Headers',     icon: 'list',      disabled: false },
    { value: 'source',      label: 'Source',      icon: 'code',      disabled: false },
  ])

  let panelOpen = $state(false)
  let panelTrigger: HTMLButtonElement
  let panelMenu: HTMLDivElement | undefined = $state()

  const currentPanel = $derived(panelOptions.find((p) => p.value === panel) ?? panelOptions[0])
  const relayEnabled = $derived(!!config?.isOutgoingEnabled)

  function togglePanel() { panelOpen = !panelOpen }
  function pickPanel(p: PanelOption) {
    if (p.disabled) return
    onPanelChange(p.value)
    panelOpen = false
  }

  $effect(() => {
    if (!panelOpen) return
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (panelTrigger?.contains(t)) return
      if (panelMenu?.contains(t)) return
      panelOpen = false
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  })
</script>

<div class="flex items-center gap-1 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
  <a
    href="#/"
    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    title="Back to list"
    aria-label="Back to list"
  >
    <Icon name="arrow-left" />
  </a>

  <div class="relative">
    <button
      bind:this={panelTrigger}
      type="button"
      onclick={togglePanel}
      class="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Icon name={currentPanel.icon} />
      <span>{currentPanel.label}</span>
      <Icon name="chevron-down" size={12} />
    </button>
    {#if panelOpen}
      <div
        bind:this={panelMenu}
        class="absolute left-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        {#each panelOptions as opt}
          <button
            type="button"
            onclick={() => pickPanel(opt)}
            disabled={opt.disabled}
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-700"
            class:font-medium={opt.value === panel}
            class:text-blue-600={opt.value === panel}
            class:dark:text-blue-400={opt.value === panel}
          >
            <Icon name={opt.icon} />
            <span>{opt.label}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <ViewportSelector
    {width}
    disabled={panel !== 'html'}
    onChange={onWidthChange}
  />

  <div class="ml-auto flex items-center gap-1">
    <a
      href={api.downloadUrl(email.id)}
      class="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      title="Download .eml"
    >
      <Icon name="download" />
      <span class="hidden sm:inline">Download</span>
    </a>
    <button
      type="button"
      onclick={onRelay}
      disabled={!relayEnabled}
      class="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
      title={relayEnabled ? 'Relay email' : 'Relay disabled — start maildev with --outgoing-host'}
    >
      <Icon name="send" />
      <span class="hidden sm:inline">Relay</span>
    </button>
    <button
      type="button"
      onclick={onDelete}
      class="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
      title="Delete email"
    >
      <Icon name="trash" />
      <span class="hidden sm:inline">Delete</span>
    </button>
  </div>
</div>
