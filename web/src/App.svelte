<script lang="ts">
  import { onMount } from 'svelte'

  type Config = {
    version: string
    smtpPort: number
    isOutgoingEnabled: boolean
    outgoingHost: string | null
  }

  let config = $state<Config | null>(null)
  let error = $state<string | null>(null)

  onMount(async () => {
    try {
      const res = await fetch('config')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      config = await res.json()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }
  })
</script>

<main class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <header class="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
    <h1 class="text-2xl font-semibold tracking-tight">MailDev</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">Svelte UI scaffold</p>
  </header>

  <section class="px-6 py-8 max-w-3xl">
    <h2 class="text-lg font-medium mb-3">Backend connection</h2>
    {#if error}
      <p class="rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
        Failed to reach <code class="font-mono">/config</code>: {error}
      </p>
    {:else if config}
      <dl class="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
        <dt class="text-slate-500 dark:text-slate-400">Version</dt>
        <dd class="font-mono">{config.version}</dd>
        <dt class="text-slate-500 dark:text-slate-400">SMTP port</dt>
        <dd class="font-mono">{config.smtpPort}</dd>
        <dt class="text-slate-500 dark:text-slate-400">Outgoing relay</dt>
        <dd class="font-mono">{config.isOutgoingEnabled ? config.outgoingHost ?? 'enabled' : 'disabled'}</dd>
      </dl>
    {:else}
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
    {/if}
  </section>
</main>
