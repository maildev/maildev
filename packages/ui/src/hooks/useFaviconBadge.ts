import { useEffect, useRef } from 'react'

const BADGE_SIZE = 16
const BADGE_FONT_SIZE = 10
const BADGE_COLOR = '#ef4444' // Red
const BADGE_TEXT_COLOR = '#ffffff'

/**
 * Create a favicon with a badge showing the unread count
 */
function createFaviconWithBadge(count: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = BADGE_SIZE
  canvas.height = BADGE_SIZE
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return ''
  }

  // Draw base icon (simple envelope)
  ctx.fillStyle = '#3b82f6' // Blue
  ctx.fillRect(0, 4, 16, 10)
  ctx.fillStyle = '#2563eb' // Darker blue
  ctx.beginPath()
  ctx.moveTo(0, 4)
  ctx.lineTo(8, 10)
  ctx.lineTo(16, 4)
  ctx.fill()

  // Draw badge if count > 0
  if (count > 0) {
    const badgeText = count > 99 ? '99+' : String(count)

    // Badge circle
    ctx.fillStyle = BADGE_COLOR
    ctx.beginPath()
    ctx.arc(12, 4, 5, 0, Math.PI * 2)
    ctx.fill()

    // Badge text
    ctx.fillStyle = BADGE_TEXT_COLOR
    ctx.font = `bold ${BADGE_FONT_SIZE}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(badgeText.length > 2 ? '!' : badgeText, 12, 4)
  }

  return canvas.toDataURL('image/png')
}

/**
 * Hook to update the favicon with unread count badge
 */
export function useFaviconBadge(unreadCount: number) {
  const originalFaviconRef = useRef<string | null>(null)
  const linkRef = useRef<HTMLLinkElement | null>(null)

  useEffect(() => {
    // Find existing favicon link
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

    if (!link) {
      // Create a new link element if none exists
      link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/png'
      document.head.appendChild(link)
    }

    linkRef.current = link

    // Store original favicon
    if (originalFaviconRef.current === null) {
      originalFaviconRef.current = link.href
    }

    // Update favicon with badge
    const newFavicon = createFaviconWithBadge(unreadCount)
    if (newFavicon) {
      link.href = newFavicon
    }

    // Update document title
    if (unreadCount > 0) {
      const baseTitle = document.title.replace(/^\(\d+\)\s*/, '')
      document.title = `(${unreadCount}) ${baseTitle}`
    } else {
      document.title = document.title.replace(/^\(\d+\)\s*/, '')
    }

    return () => {
      // Restore original favicon on unmount
      if (linkRef.current && originalFaviconRef.current) {
        linkRef.current.href = originalFaviconRef.current
      }
      // Restore title
      document.title = document.title.replace(/^\(\d+\)\s*/, '')
    }
  }, [unreadCount])
}
