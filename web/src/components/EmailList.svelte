<script lang="ts">
  import { store } from '../lib/stores.svelte'
  import EmailListItem from './EmailListItem.svelte'
</script>

{#if store.isLoading && store.emails.size === 0}
  <p class="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</p>
{:else if store.loadError}
  <p class="m-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
    {store.loadError}
  </p>
{:else if store.filtered.length === 0}
  <p class="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
    {store.searchTerm ? 'No emails match your search' : 'No emails'}
  </p>
{:else}
  <ul class="divide-y divide-slate-100 dark:divide-slate-800/60">
    {#each store.filtered as email (email.id)}
      <EmailListItem {email} />
    {/each}
  </ul>
{/if}
