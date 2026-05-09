<script lang="ts">
  import { onMount } from 'svelte'
  import { push } from 'svelte-spa-router'
  import { api } from '../lib/api'
  import { store } from '../lib/stores.svelte'
  import type { Email, Config } from '../lib/types'
  import ViewerToolbar, { type Panel } from './ViewerToolbar.svelte'
  import HtmlViewer from './HtmlViewer.svelte'
  import TextViewer from './TextViewer.svelte'
  import HeadersViewer from './HeadersViewer.svelte'
  import SourceViewer from './SourceViewer.svelte'
  import AttachmentsList from './AttachmentsList.svelte'
  import RelayDialog from './RelayDialog.svelte'
  import Icon from './Icon.svelte'

  function humanSize(bytes: number | undefined): string {
    if (!bytes && bytes !== 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  type Props = { params?: { id?: string } }
  let { params }: Props = $props()
  const id = $derived(params?.id ? decodeURIComponent(params.id) : '')

  let email = $state<Email | null>(null)
  let loadError = $state<string | null>(null)
  let panel = $state<Panel>('html')
  let width = $state<string | null>(null)
  let config = $state<Config | null>(null)
  let relayOpen = $state(false)

  function defaultPanel(e: Email): Panel {
    if (e.html) return 'html'
    if (e.text) return 'plain'
    if (e.attachments?.length) return 'attachments'
    return 'headers'
  }

  async function loadEmail(targetId: string) {
    if (!targetId) return
    loadError = null
    try {
      const e = await api.get(targetId)
      email = e
      panel = defaultPanel(e)
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err)
      // Mirror legacy behavior: not found → back to home.
      push('/')
    }
  }

  $effect(() => {
    if (id) void loadEmail(id)
  })

  onMount(async () => {
    try { config = await api.config() } catch { /* config stays null */ }
  })

  function onRelay() {
    if (!config?.isOutgoingEnabled) return
    relayOpen = true
  }

  async function onDelete() {
    if (!email) return
    if (!window.confirm('Delete this email?')) return
    await store.deleteEmail(email.id)
  }

  function joinAddresses(list: { address: string; name?: string }[] | undefined): string {
    return (list ?? []).map((a) => (a.name ? `${a.name} <${a.address}>` : a.address)).join(', ')
  }
</script>

{#if loadError}
  <section class="flex h-full items-center justify-center px-8 text-center text-sm text-rose-600 dark:text-rose-400">
    Failed to load email: {loadError}
  </section>
{:else if !email}
  <section class="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500 dark:text-slate-400">
    Loading…
  </section>
{:else}
  <section class="flex h-full flex-col">
    <ViewerToolbar
      {email}
      {config}
      {panel}
      {width}
      onPanelChange={(p) => (panel = p)}
      onWidthChange={(w) => (width = w)}
      onRelay={onRelay}
      onDelete={onDelete}
    />

    <header class="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <h1 class="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
        {email.subject || '(no subject)'}
      </h1>
      <dl class="mt-1.5 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt class="text-slate-500 dark:text-slate-400">From</dt>
        <dd class="break-all text-slate-700 dark:text-slate-300">{joinAddresses(email.from)}</dd>
        <dt class="text-slate-500 dark:text-slate-400">To</dt>
        <dd class="break-all text-slate-700 dark:text-slate-300">{joinAddresses(email.to)}</dd>
        {#if email.cc?.length}
          <dt class="text-slate-500 dark:text-slate-400">Cc</dt>
          <dd class="break-all text-slate-700 dark:text-slate-300">{joinAddresses(email.cc)}</dd>
        {/if}
        {#if email.bcc?.length}
          <dt class="text-slate-500 dark:text-slate-400">Bcc</dt>
          <dd class="break-all text-slate-700 dark:text-slate-300">{joinAddresses(email.bcc)}</dd>
        {/if}
      </dl>

      {#if email.attachments?.length}
        <ul class="mt-2.5 flex flex-wrap items-center gap-1.5">
          {#each email.attachments as att}
            <li>
              <a
                href={api.attachmentUrl(email.id, att.generatedFileName)}
                target="_blank"
                rel="noopener"
                title={`${att.fileName || att.generatedFileName} (${att.contentType})`}
                class="inline-flex max-w-xs items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:bg-violet-900/30 dark:hover:text-violet-200"
              >
                <Icon name="paperclip" size={12} class="shrink-0" />
                <span class="truncate font-medium">{att.fileName || att.generatedFileName}</span>
                {#if att.length}
                  <span class="shrink-0 text-slate-500 dark:text-slate-400">{humanSize(att.length)}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </header>

    <div class="flex-1 overflow-hidden">
      {#if panel === 'html' && email.html}
        <HtmlViewer id={email.id} {width} />
      {:else if panel === 'plain'}
        <TextViewer text={email.text ?? ''} />
      {:else if panel === 'attachments'}
        <AttachmentsList id={email.id} attachments={email.attachments ?? []} />
      {:else if panel === 'headers'}
        <HeadersViewer headers={email.headers} />
      {:else if panel === 'source'}
        <SourceViewer id={email.id} />
      {/if}
    </div>
  </section>

  {#if relayOpen && config}
    <RelayDialog {email} {config} onClose={() => (relayOpen = false)} />
  {/if}
{/if}
