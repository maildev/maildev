const SIZE = 32
const BADGE_RADIUS = SIZE / 3.2
const BADGE_X = SIZE - BADGE_RADIUS
const BADGE_Y = SIZE - BADGE_RADIUS

let link: HTMLLinkElement | null = null
let lastCount = -1

function ensureLink(): HTMLLinkElement {
  if (link) return link
  let existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!existing) {
    existing = document.createElement('link')
    existing.rel = 'icon'
    document.head.appendChild(existing)
  }
  link = existing
  return existing
}

function drawEnvelope(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#1e293b'
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'

  // body
  ctx.fillRect(4, 9, 24, 15)

  // flap (white V on top of body)
  ctx.beginPath()
  ctx.moveTo(4, 9)
  ctx.lineTo(16, 18)
  ctx.lineTo(28, 9)
  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawBadge(ctx: CanvasRenderingContext2D, count: number) {
  ctx.beginPath()
  ctx.arc(BADGE_X, BADGE_Y, BADGE_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = '#dc2626'
  ctx.fill()

  const label = count > 99 ? '99+' : String(count)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${count > 99 ? 8 : 11}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, BADGE_X, BADGE_Y + 0.5)
}

export function setUnreadCount(count: number): void {
  if (count === lastCount) return
  lastCount = count

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  drawEnvelope(ctx)
  if (count > 0) drawBadge(ctx, count)

  ensureLink().href = canvas.toDataURL('image/png')
}
