import type { Settings } from './types'

const STORAGE_KEY = 'maildevSettings'

export const defaultSettings: Settings = {
  notificationsEnabled: false,
  autoShowEnabled: false,
  darkThemeEnabled: false,
}

export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSettings }
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch (err) {
    console.error('MailDev: error loading settings', err)
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('MailDev: error saving settings', err)
  }
}
