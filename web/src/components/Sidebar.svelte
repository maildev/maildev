<script lang="ts">
  import { store } from '../lib/stores.svelte'
  import EmailList from './EmailList.svelte'
  import SearchBar from './SearchBar.svelte'
  import ThemeToggle from './ThemeToggle.svelte'
  import ToolbarMenu from './ToolbarMenu.svelte'
  import DeleteAllButton from './DeleteAllButton.svelte'
  import Icon from './Icon.svelte'

  function refresh() {
    void store.refreshList()
  }

  function markAllRead() {
    void store.markAllRead()
  }
</script>

<aside class="flex h-screen w-80 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
  <header class="flex flex-col gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
    <div class="flex items-center justify-between gap-2">
      <a href="#/" class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
        <Icon name="envelope" />
        <span>MailDev</span>
      </a>
      {#if store.emails.size > 0}
        <span
          class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          title="Total emails (+ unread)"
        >
          {store.emails.size}{store.unreadCount > 0 ? ` (+${store.unreadCount})` : ''}
        </span>
      {/if}
    </div>

    <div class="flex items-center justify-end gap-1">
      <button
        type="button"
        onclick={refresh}
        title="Refresh emails"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Icon name="refresh" />
      </button>
      <button
        type="button"
        onclick={markAllRead}
        title="Mark all emails as read"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Icon name="check-double" />
      </button>
      <DeleteAllButton />
      <ThemeToggle />
      <ToolbarMenu />
    </div>
  </header>

  <div class="border-b border-slate-200 px-3 py-2 dark:border-slate-800">
    <SearchBar />
  </div>

  <div class="flex-1 overflow-y-auto">
    <EmailList />
  </div>
</aside>
