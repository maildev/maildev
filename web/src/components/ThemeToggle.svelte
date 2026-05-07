<script lang="ts">
  import { store } from '../lib/stores.svelte'
  import Icon from './Icon.svelte'
</script>

<button
  type="button"
  onclick={() => store.toggleDarkTheme()}
  title="Toggle between light and dark theme"
  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
>
  {#if store.settings.darkThemeEnabled}
    <Icon name="sun" />
  {:else}
    <Icon name="moon" />
  {/if}
</button>
