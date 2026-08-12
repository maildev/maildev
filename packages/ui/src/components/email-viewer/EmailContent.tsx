import { useState, useRef, useEffect, useCallback } from 'react'
import type { Email } from '@maildev/core'
import { useEmailHtml, useEmailSource } from '../../hooks/useEmails'
import { cn } from '../../lib/utils'
import { Tooltip } from '../ui/Tooltip'

interface EmailContentProps {
  email: Email
}

type TabType = 'html' | 'text' | 'headers' | 'source'

const VIEWPORT_OPTIONS = [
  { value: '100%', label: '100%', icon: 'desktop' },
  { value: '1440px', label: '1440px', icon: 'desktop' },
  { value: '1024px', label: '1024px', icon: 'tablet' },
  { value: '768px', label: '768px', icon: 'tablet' },
  { value: '425px', label: '425px', icon: 'mobile' },
  { value: '375px', label: '375px', icon: 'mobile' },
  { value: '320px', label: '320px', icon: 'mobile' },
] as const

export function EmailContent({ email }: EmailContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('html')
  const [viewport, setViewport] = useState<string>('100%')
  const [showViewportMenu, setShowViewportMenu] = useState(false)
  const viewportMenuRef = useRef<HTMLDivElement>(null)
  const { data: htmlContent } = useEmailHtml(email.id)
  const { data: sourceContent } = useEmailSource(email.id)

  // Close viewport menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewportMenuRef.current && !viewportMenuRef.current.contains(event.target as Node)) {
        setShowViewportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const tabs: { id: TabType; label: string; available: boolean }[] = [
    { id: 'html', label: 'HTML', available: !!email.html },
    { id: 'text', label: 'Plain Text', available: !!email.text },
    { id: 'headers', label: 'Headers', available: true },
    { id: 'source', label: 'Source', available: true },
  ]

  // Auto-select first available tab if current is not available
  const currentTabAvailable = tabs.find((t) => t.id === activeTab)?.available
  if (!currentTabAvailable) {
    const firstAvailable = tabs.find((t) => t.available)
    if (firstAvailable && firstAvailable.id !== activeTab) {
      setActiveTab(firstAvailable.id)
    }
  }

  const currentViewport = VIEWPORT_OPTIONS.find((v) => v.value === viewport) ?? VIEWPORT_OPTIONS[0]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={!tab.available}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]'
                  : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
                !tab.available && 'cursor-not-allowed opacity-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Viewport selector - only show on HTML tab */}
        {activeTab === 'html' && (
          <div className="relative mr-2" ref={viewportMenuRef}>
            <Tooltip content="Change viewport size" position="left">
              <button
                onClick={() => setShowViewportMenu(!showViewportMenu)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm',
                  'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]'
                )}
              >
                <ViewportIcon type={currentViewport.icon} />
                <span>{currentViewport.label}</span>
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </Tooltip>

            {/* Dropdown menu */}
            {showViewportMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-1 shadow-lg">
                {VIEWPORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setViewport(option.value)
                      setShowViewportMenu(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-sm',
                      'hover:bg-[hsl(var(--muted))]',
                      viewport === option.value
                        ? 'text-[hsl(var(--primary))]'
                        : 'text-[hsl(var(--foreground))]'
                    )}
                  >
                    <ViewportIcon type={option.icon} />
                    <span>{option.label}</span>
                    {viewport === option.value && (
                      <svg
                        className="ml-auto h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[hsl(var(--background))]">
        {activeTab === 'html' && (
          <HtmlContent html={htmlContent || email.html} viewport={viewport} />
        )}
        {activeTab === 'text' && <TextContent text={email.text} />}
        {activeTab === 'headers' && <HeadersContent headers={email.headers} />}
        {activeTab === 'source' && <SourceContent source={sourceContent} />}
      </div>
    </div>
  )
}

// Keys that should be forwarded from iframe to parent for keyboard shortcuts
const FORWARDED_KEYS = new Set([
  'j',
  'k',
  'r',
  's',
  'a',
  'c',
  '/',
  '?',
  'Escape',
  'Delete',
  'Backspace',
])

export function getEmailDocumentHeight(doc: Document): number {
  const { body, documentElement } = doc
  if (!body || !documentElement) {
    return 0
  }

  const bodyTop = body.getBoundingClientRect().top
  const childBottom = Array.from(body.children).reduce((max, child) => {
    const rect = child.getBoundingClientRect()
    return Math.max(max, rect.bottom - bodyTop)
  }, 0)
  const bodyStyle = doc.defaultView?.getComputedStyle(body)
  const bodyMarginBottom = bodyStyle ? parseFloat(bodyStyle.marginBottom) || 0 : 0

  return Math.ceil(
    Math.max(
      documentElement.scrollHeight,
      documentElement.offsetHeight,
      documentElement.clientHeight,
      body.scrollHeight,
      body.offsetHeight,
      childBottom + bodyMarginBottom
    )
  )
}

function HtmlContent({ html, viewport }: { html: string | undefined; viewport: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const iframeCleanupRef = useRef<(() => void) | null>(null)
  const [iframeHeight, setIframeHeight] = useState<number | null>(null)

  const updateIframeHeight = useCallback(() => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc) {
      return
    }

    const nextHeight = getEmailDocumentHeight(doc)
    if (nextHeight > 0) {
      setIframeHeight((currentHeight) =>
        currentHeight === nextHeight ? currentHeight : nextHeight
      )
    }
  }, [])

  const scheduleIframeResize = useCallback(() => {
    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current)
    }

    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = null
      updateIframeHeight()
    })
  }, [updateIframeHeight])

  const cleanupIframe = useCallback(() => {
    iframeCleanupRef.current?.()
    iframeCleanupRef.current = null

    if (resizeFrameRef.current !== null) {
      window.cancelAnimationFrame(resizeFrameRef.current)
      resizeFrameRef.current = null
    }
  }, [])

  useEffect(() => cleanupIframe, [cleanupIframe])

  useEffect(() => {
    cleanupIframe()
    setIframeHeight(null)
  }, [cleanupIframe, html, viewport])

  // Forward keyboard shortcuts from iframe to parent window
  const handleIframeLoad = () => {
    cleanupIframe()

    const iframe = iframeRef.current
    const iframeWindow = iframe?.contentWindow
    const iframeDocument = iframe?.contentDocument
    if (!iframeWindow || !iframeDocument) return

    const cleanupCallbacks: (() => void)[] = []

    try {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Forward Cmd+K / Ctrl+K to parent (command palette)
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'k',
              metaKey: e.metaKey,
              ctrlKey: e.ctrlKey,
              bubbles: true,
            })
          )
          return
        }

        // Forward other shortcut keys (only if no modifier keys pressed)
        if (!e.metaKey && !e.ctrlKey && !e.altKey && FORWARDED_KEYS.has(e.key)) {
          e.preventDefault()
          window.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: e.key,
              bubbles: true,
            })
          )
        }
      }

      iframeWindow.addEventListener('keydown', handleKeyDown)
      cleanupCallbacks.push(() => iframeWindow.removeEventListener('keydown', handleKeyDown))

      iframeWindow.addEventListener('resize', scheduleIframeResize)
      cleanupCallbacks.push(() => iframeWindow.removeEventListener('resize', scheduleIframeResize))

      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(scheduleIframeResize)
        resizeObserver.observe(iframeDocument.documentElement)
        if (iframeDocument.body) {
          resizeObserver.observe(iframeDocument.body)
        }
        cleanupCallbacks.push(() => resizeObserver.disconnect())
      }

      for (const image of Array.from(iframeDocument.images)) {
        image.addEventListener('load', scheduleIframeResize)
        image.addEventListener('error', scheduleIframeResize)
        cleanupCallbacks.push(() => {
          image.removeEventListener('load', scheduleIframeResize)
          image.removeEventListener('error', scheduleIframeResize)
        })
      }

      const fonts = (
        iframeDocument as Document & {
          fonts?: { ready?: Promise<unknown> }
        }
      ).fonts
      fonts?.ready?.then(scheduleIframeResize).catch(() => undefined)
    } catch {
      // Ignore cross-origin errors (shouldn't happen with srcdoc)
    }

    iframeCleanupRef.current = () => {
      for (const cleanup of cleanupCallbacks) {
        cleanup()
      }
    }
    scheduleIframeResize()
  }

  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
        No HTML content
      </div>
    )
  }

  const isFullWidth = viewport === '100%'

  return (
    <div className={cn('min-h-full', isFullWidth ? 'w-full' : 'flex justify-center p-4')}>
      <div
        className={cn(
          'min-h-full bg-white',
          !isFullWidth && 'border border-[hsl(var(--border))] shadow-sm'
        )}
        style={{ width: viewport, maxWidth: '100%' }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={html}
          className="block min-h-full w-full border-none bg-white"
          style={{
            height: iframeHeight ? `${iframeHeight}px` : '100%',
          }}
          sandbox="allow-same-origin"
          title="Email HTML content"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  )
}

function ViewportIcon({ type }: { type: 'desktop' | 'tablet' | 'mobile' }) {
  if (type === 'desktop') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    )
  }
  if (type === 'tablet') {
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    )
  }
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  )
}

function TextContent({ text }: { text: string | undefined }) {
  if (!text) {
    return (
      <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
        No plain text content
      </div>
    )
  }

  return (
    <pre className="whitespace-pre-wrap break-words p-4 text-sm font-mono text-[hsl(var(--foreground))]">
      {text}
    </pre>
  )
}

function HeadersContent({ headers }: { headers?: Record<string, string | string[]> }) {
  if (!headers || Object.keys(headers).length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
        No headers available
      </div>
    )
  }

  const sortedHeaders = Object.entries(headers).sort(([a], [b]) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )

  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <tbody>
          {sortedHeaders.map(([key, value]) => (
            <tr key={key} className="border-b border-[hsl(var(--border))]">
              <td className="py-2 pr-4 font-medium text-[hsl(var(--foreground))] align-top whitespace-nowrap">
                {key}
              </td>
              <td className="py-2 text-[hsl(var(--muted-foreground))] break-all font-mono text-xs">
                {Array.isArray(value) ? value.join(', ') : value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SourceContent({ source }: { source: string | undefined }) {
  if (!source) {
    return (
      <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
        Loading source...
      </div>
    )
  }

  return (
    <pre className="whitespace-pre-wrap break-all p-4 text-xs font-mono text-[hsl(var(--foreground))]">
      {source}
    </pre>
  )
}
