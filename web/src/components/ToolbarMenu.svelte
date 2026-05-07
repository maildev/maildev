<script lang="ts">
  import { store } from '../lib/stores.svelte'
  import { notificationsSupported } from '../lib/notifications'
  import Icon from './Icon.svelte'

  let open = $state(false)
  let root: HTMLDivElement

  function toggle(event: MouseEvent) {
    event.stopPropagation()
    open = !open
  }

  function close() {
    open = false
  }

  $effect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (root && !root.contains(event.target as Node)) close()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  })
</script>

<div bind:this={root} class="relative">
  <button
    type="button"
    onclick={toggle}
    title="Additional configuration"
    class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
  >
    <Icon name="cog" />
  </button>

  {#if open}
    <div
      role="menu"
      class="absolute right-0 top-full z-20 mt-2 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
    >
      <label
        class="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 {notificationsSupported ? '' : 'cursor-not-allowed opacity-50'}"
        title={notificationsSupported ? '' : 'Notifications require localhost or HTTPS'}
      >
        <span>Browser notifications</span>
        <input
          type="checkbox"
          disabled={!notificationsSupported}
          checked={store.settings.notificationsEnabled}
          onchange={() => store.toggleNotifications()}
          class="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
      </label>

      <label class="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
        <span>Open new mail</span>
        <input
          type="checkbox"
          checked={store.settings.autoShowEnabled}
          onchange={() => store.toggleAutoShow()}
          class="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
        />
      </label>
    </div>
  {/if}
</div>
