export type Address = {
  address: string
  name?: string
}

export type Attachment = {
  contentType: string
  fileName: string
  generatedFileName: string
  contentId?: string
  checksum?: string
  length?: number
  transferEncoding?: string
}

export type Email = {
  id: string
  time: string
  read: boolean
  subject: string
  from: Address[]
  to: Address[]
  cc?: Address[]
  bcc?: Address[]
  envelope?: { from?: Address[]; to?: Address[] }
  attachments?: Attachment[]
  html?: string
  text?: string
  headers?: Record<string, string | string[]>
  size?: number
}

export type Config = {
  version: string
  smtpPort: number
  isOutgoingEnabled: boolean
  outgoingHost: string | null
}

export type DeleteMailEvent = { id: string; index?: number }

export type Settings = {
  notificationsEnabled: boolean
  autoShowEnabled: boolean
  darkThemeEnabled: boolean
}
