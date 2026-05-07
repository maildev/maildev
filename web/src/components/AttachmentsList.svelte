<script lang="ts">
  import type { Attachment } from '../lib/types'
  import { api } from '../lib/api'
  import Icon from './Icon.svelte'

  type Props = { id: string; attachments: Attachment[] }
  let { id, attachments }: Props = $props()

  function humanSize(bytes: number | undefined): string {
    if (!bytes && bytes !== 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
</script>

<div class="h-full w-full overflow-auto bg-white p-4 dark:bg-slate-900">
  {#if attachments.length === 0}
    <p class="text-sm text-slate-500 dark:text-slate-400">No attachments.</p>
  {:else}
    <ul class="space-y-1">
      {#each attachments as att}
        <li>
          <a
            href={api.attachmentUrl(id, att.generatedFileName)}
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Icon name="paperclip" />
            <span class="font-medium">{att.fileName || att.generatedFileName}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">
              {att.contentType}{#if att.length} · {humanSize(att.length)}{/if}
            </span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</div>
