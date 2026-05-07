<script lang="ts">
  type Props = { headers: Record<string, string | string[]> | undefined }
  let { headers }: Props = $props()

  const entries = $derived(
    Object.entries(headers ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v] as const)
  )
</script>

<div class="h-full w-full overflow-auto bg-white p-4 dark:bg-slate-900">
  {#if entries.length === 0}
    <p class="text-sm text-slate-500 dark:text-slate-400">No headers available.</p>
  {:else}
    <table class="w-full border-collapse text-sm">
      <tbody>
        {#each entries as [key, value]}
          <tr class="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
            <td class="w-1/4 min-w-32 break-all py-1.5 pr-3 align-top font-medium text-slate-700 dark:text-slate-200">{key}</td>
            <td class="break-all py-1.5 align-top font-mono text-slate-600 dark:text-slate-300">{value}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
