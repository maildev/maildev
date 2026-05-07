<script lang="ts">
  import { store } from '../lib/stores.svelte'
  import { onMount } from 'svelte'
  import { api } from '../lib/api'
  import type { Config } from '../lib/types'

  let config = $state<Config | null>(null)

  onMount(async () => {
    try {
      config = await api.config()
    } catch {
      // surfaced via the connection indicator below
    }
  })
</script>

<section class="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-slate-500 dark:text-slate-400">
  <h2 class="text-xl font-medium text-slate-700 dark:text-slate-200">Welcome to MailDev</h2>
  <p class="max-w-md text-sm">
    Select an email from the sidebar to view its contents. New emails arrive in real time.
  </p>

  {#if config}
    <dl class="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      <dt>Version</dt><dd class="font-mono">{config.version}</dd>
      <dt>SMTP port</dt><dd class="font-mono">{config.smtpPort}</dd>
      <dt>Outgoing relay</dt>
      <dd class="font-mono">{config.isOutgoingEnabled ? config.outgoingHost ?? 'enabled' : 'disabled'}</dd>
      <dt>Realtime</dt>
      <dd class="font-mono">{store.socketConnected ? 'connected' : 'disconnected'}</dd>
    </dl>
  {/if}
</section>
