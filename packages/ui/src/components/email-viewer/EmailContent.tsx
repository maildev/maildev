import { useState } from 'react'
import type { Email } from '@maildev/core'
import { useEmailHtml, useEmailSource } from '../../hooks/useEmails'
import { cn } from '../../lib/utils'

interface EmailContentProps {
  email: Email
}

type TabType = 'html' | 'text' | 'headers' | 'source'

export function EmailContent({ email }: EmailContentProps) {
  const [activeTab, setActiveTab] = useState<TabType>('html')
  const { data: htmlContent } = useEmailHtml(email.id)
  const { data: sourceContent } = useEmailSource(email.id)

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
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

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[hsl(var(--background))]">
        {activeTab === 'html' && (
          <HtmlContent html={htmlContent || email.html} />
        )}
        {activeTab === 'text' && <TextContent text={email.text} />}
        {activeTab === 'headers' && <HeadersContent headers={email.headers} />}
        {activeTab === 'source' && <SourceContent source={sourceContent} />}
      </div>
    </div>
  )
}

function HtmlContent({ html }: { html: string | undefined }) {
  if (!html) {
    return (
      <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]">
        No HTML content
      </div>
    )
  }

  return (
    <iframe
      srcDoc={html}
      className="h-full w-full border-none bg-white"
      sandbox="allow-same-origin"
      title="Email HTML content"
    />
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
