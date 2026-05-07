<script lang="ts">
  import { api } from '../lib/api'

  type Props = { id: string }
  let { id }: Props = $props()
</script>

<iframe
  src={api.sourceUrl(id)}
  title="Email source"
  class="h-full w-full border-0 bg-white dark:bg-slate-900"
></iframe>
