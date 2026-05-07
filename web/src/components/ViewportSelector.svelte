<script lang="ts">
  import Icon from './Icon.svelte'

  type Props = { width: string | null; disabled?: boolean; onChange: (w: string | null) => void }
  let { width, disabled = false, onChange }: Props = $props()

  type Option = { value: string | null; label: string; icon: 'desktop' | 'tablet' | 'smartphone' }
  const options: Option[] = [
    { value: null,     label: '100%',   icon: 'desktop' },
    { value: '1440px', label: '1440px', icon: 'desktop' },
    { value: '1024px', label: '1024px', icon: 'tablet' },
    { value: '768px',  label: '768px',  icon: 'tablet' },
    { value: '425px',  label: '425px',  icon: 'smartphone' },
    { value: '375px',  label: '375px',  icon: 'smartphone' },
    { value: '320px',  label: '320px',  icon: 'smartphone' },
  ]

  let open = $state(false)
  let trigger: HTMLButtonElement
  let menu: HTMLDivElement | undefined = $state()

  const current = $derived(options.find((o) => o.value === width) ?? options[0])

  function toggle() { if (!disabled) open = !open }
  function pick(v: string | null) {
    onChange(v)
    open = false
  }

  $effect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      const t = e.target as Node
      if (trigger?.contains(t)) return
      if (menu?.contains(t)) return
      open = false
    }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  })
</script>

<div class="relative">
  <button
    bind:this={trigger}
    type="button"
    onclick={toggle}
    {disabled}
    class="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
    title="Viewport size"
  >
    <Icon name={current.icon} />
    <span>{current.label}</span>
    <Icon name="chevron-down" size={12} />
  </button>

  {#if open}
    <div
      bind:this={menu}
      class="absolute right-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      {#each options as opt}
        <button
          type="button"
          onclick={() => pick(opt.value)}
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          class:font-medium={opt.value === width}
          class:text-blue-600={opt.value === width}
          class:dark:text-blue-400={opt.value === width}
        >
          <Icon name={opt.icon} />
          <span>{opt.label}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
