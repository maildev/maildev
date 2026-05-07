<script lang="ts">
  type Props = { text: string }
  let { text }: Props = $props()
</script>

<pre class="h-full w-full overflow-auto whitespace-pre-wrap break-words bg-white p-4 font-mono text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-200">{text}</pre>
