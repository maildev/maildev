<script lang="ts">
  import type { Email } from '../lib/types'
  import { store } from '../lib/stores.svelte'
  import Icon from './Icon.svelte'

  type Props = { email: Email }
  let { email }: Props = $props()

  const isCurrent = $derived(store.selectedId === email.id)

  const recipient = $derived.by(() => {
    if (!email.to || email.to.length === 0) return ''
    const first = email.to[0]?.address ?? ''
    const extras = email.to.length > 1 ? ` +${email.to.length - 1}` : ''
    return `${first}${extras}`
  })

  const formattedTime = $derived.by(() => {
    if (!email.time) return ''
    try {
      const d = new Date(email.time)
      const pad = (n: number) => String(n).padStart(2, '0')
      const tzOffset = -d.getTimezoneOffset()
      const tzSign = tzOffset >= 0 ? '+' : '-'
      const tzH = pad(Math.floor(Math.abs(tzOffset) / 60))
      const tzM = pad(Math.abs(tzOffset) % 60)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} (${tzSign}${tzH}${tzM})`
    } catch {
      return email.time
    }
  })

  const allRecipients = $derived(email.to?.map(t => t.address).join(', ') ?? '')
</script>

<li class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
  <a
    href={`#/email/${encodeURIComponent(email.id)}`}
    aria-current={isCurrent ? 'page' : undefined}
    class="flex flex-col gap-0.5 border-l-2 px-3 py-2.5 text-sm transition-colors {!email.read
      ? 'border-violet-500'
      : 'border-transparent'} {isCurrent
      ? 'bg-violet-100 text-slate-900 dark:bg-violet-900/40 dark:text-slate-100'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'}"
  >
    <span class="flex items-center gap-1.5 leading-tight">
      {#if !email.read}
        <span class="h-2 w-2 shrink-0 rounded-full bg-violet-500" aria-hidden="true"></span>
        <span class="sr-only">Unread</span>
      {/if}
      <span
        class="truncate {!email.read
          ? 'font-semibold text-slate-900 dark:text-slate-100'
          : 'font-medium'}"
      >
        {email.subject || '(no subject)'}
      </span>
      {#if email.attachments && email.attachments.length > 0}
        <Icon name="paperclip" size={12} class="shrink-0 text-slate-400 dark:text-slate-500" />
      {/if}
    </span>
    <span class="truncate text-xs text-slate-500 dark:text-slate-400" title={allRecipients}>
      To: {recipient}
    </span>
    <span class="text-[11px] text-slate-400 dark:text-slate-500">{formattedTime}</span>
  </a>
</li>
