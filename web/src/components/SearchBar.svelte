<script lang="ts">
  import { store } from '../lib/stores.svelte'
  import Icon from './Icon.svelte'
</script>

<label class="relative block">
  <span class="sr-only">Search emails</span>
  <input
    type="search"
    bind:value={store.searchTerm}
    placeholder="Search…"
    class="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-500 dark:focus:ring-violet-900/40"
  />
  <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
</label>
