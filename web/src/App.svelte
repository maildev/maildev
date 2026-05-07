<script lang="ts">
  import Router, { router } from 'svelte-spa-router'
  import { onMount } from 'svelte'
  import Sidebar from './components/Sidebar.svelte'
  import Welcome from './components/Welcome.svelte'
  import EmailDetailPlaceholder from './components/EmailDetailPlaceholder.svelte'
  import { store } from './lib/stores.svelte'

  const routes = {
    '/': Welcome,
    '/email/:id': EmailDetailPlaceholder,
  }

  onMount(() => {
    store.init()
  })

  $effect(() => {
    const match = router.location.match(/^\/email\/(.+)$/)
    store.selectedId = match ? decodeURIComponent(match[1]) : null
  })

  $effect(() => {
    if (store.selectedId) store.markAsRead(store.selectedId)
  })
</script>

<div class="flex h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <Sidebar />
  <main class="flex-1 overflow-y-auto">
    <Router {routes} />
  </main>
</div>
