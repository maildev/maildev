<script lang="ts">
  import { store } from '../lib/stores.svelte'
  import Icon from './Icon.svelte'

  const SAFEGUARD_TIMEOUT_MS = 2000

  let armed = $state(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function disarm() {
    armed = false
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function onClick() {
    if (!armed) {
      armed = true
      timer = setTimeout(disarm, SAFEGUARD_TIMEOUT_MS)
      return
    }
    disarm()
    void store.deleteAll()
  }
</script>

<button
  type="button"
  onclick={onClick}
  title={armed ? 'Click again to confirm' : 'Delete all emails'}
  class="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 {armed ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}"
>
  <Icon name="trash" />
</button>
