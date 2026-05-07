<script lang="ts">
  import { api } from '../lib/api'

  type Props = { id: string; width: string | null }
  let { id, width }: Props = $props()

  let iframe: HTMLIFrameElement
  let height = $state(0)

  function applyMediaQueryFix(doc: Document) {
    for (const sheet of Array.from(doc.styleSheets)) {
      let rules: CSSRuleList | null = null
      try {
        rules = sheet.cssRules
      } catch {
        continue
      }
      if (!rules) continue
      for (const rule of Array.from(rules)) {
        const media = (rule as CSSMediaRule).media
        if (media && media.mediaText && media.mediaText.includes('device-width')) {
          media.mediaText = media.mediaText.replace(/device-width/g, 'width')
        }
      }
    }
  }

  function injectBaseTarget(doc: Document) {
    const head = doc.head ?? doc.getElementsByTagName('head')[0]
    if (!head) return
    if (head.querySelector('base[data-injected]')) return
    const base = doc.createElement('base')
    base.setAttribute('target', '_blank')
    base.setAttribute('data-injected', '1')
    head.appendChild(base)
  }

  function fitHeight(doc: Document) {
    const body = doc.body
    if (!body) return
    height = body.scrollHeight
  }

  function onLoad() {
    const doc = iframe.contentDocument
    if (!doc) return
    injectBaseTarget(doc)
    applyMediaQueryFix(doc)
    fitHeight(doc)
  }

  // Re-fit on width change (some media queries rearrange content height).
  $effect(() => {
    void width
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    requestAnimationFrame(() => fitHeight(doc))
  })
</script>

<div class="flex h-full w-full justify-center overflow-auto bg-slate-100 dark:bg-slate-950">
  <iframe
    bind:this={iframe}
    src={api.htmlUrl(id)}
    onload={onLoad}
    title="Email HTML preview"
    style:width={width ?? '100%'}
    style:height={height ? `${height}px` : '100%'}
    class="border-0 bg-white shadow-sm dark:shadow-none"
  ></iframe>
</div>
