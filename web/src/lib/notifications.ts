export const notificationsSupported =
  typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported) return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch (err) {
    console.error('MailDev: notification permission error', err)
    return false
  }
}

export type NotifyOptions = {
  body: string
  icon?: string
  onClick?: () => void
}

export function notify(title: string, options: NotifyOptions): Notification | null {
  if (!notificationsSupported || Notification.permission !== 'granted') return null
  const n = new Notification(title, { body: options.body, icon: options.icon })
  if (options.onClick) {
    n.addEventListener('click', () => {
      window.focus()
      options.onClick!()
    })
  }
  return n
}
