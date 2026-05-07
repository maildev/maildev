<script lang="ts">
  type Props = { params?: { id?: string } }
  let { params }: Props = $props()
</script>

<section class="flex h-full items-center justify-center px-8 text-center text-sm text-slate-500 dark:text-slate-400">
  <div>
    <p class="font-medium text-slate-700 dark:text-slate-200">Email detail view</p>
    <p class="mt-1">Coming in PR 3 — selected id: <code class="font-mono">{params?.id ?? '(none)'}</code></p>
  </div>
</section>
