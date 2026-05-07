import type { Email, Config } from './types'

// MAILDEV_BASE_PATHNAME-aware base path. Trailing slash stripped so we
// can always concatenate with `/path`.
const base = (() => {
  const path = new URL(document.baseURI).pathname.replace(/\/$/, '')
  return path
})()

const url = (segment: string) => `${base}${segment}`

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const api = {
  basePath: () => base,

  list: (query?: Record<string, string>): Promise<Email[]> => {
    const qs = query && Object.keys(query).length
      ? '?' + new URLSearchParams(query).toString()
      : ''
    return fetch(url(`/email${qs}`)).then(asJson<Email[]>)
  },

  get: (id: string): Promise<Email> => fetch(url(`/email/${encodeURIComponent(id)}`)).then(asJson<Email>),

  remove: (id: string): Promise<true> =>
    fetch(url(`/email/${encodeURIComponent(id)}`), { method: 'DELETE' }).then(asJson<true>),

  removeAll: (): Promise<true> =>
    fetch(url('/email/all'), { method: 'DELETE' }).then(asJson<true>),

  readAll: (): Promise<number> =>
    fetch(url('/email/read-all'), { method: 'PATCH' }).then(asJson<number>),

  relay: (id: string, to?: string): Promise<true> => {
    const segment = to ? `/email/${encodeURIComponent(id)}/relay/${encodeURIComponent(to)}` : `/email/${encodeURIComponent(id)}/relay`
    return fetch(url(segment), { method: 'POST' }).then(asJson<true>)
  },

  config: (): Promise<Config> => fetch(url('/config')).then(asJson<Config>),

  reload: (): Promise<true> => fetch(url('/reloadMailsFromDirectory')).then(asJson<true>),

  htmlUrl: (id: string) => url(`/email/${encodeURIComponent(id)}/html`),
  sourceUrl: (id: string) => url(`/email/${encodeURIComponent(id)}/source`),
  downloadUrl: (id: string) => url(`/email/${encodeURIComponent(id)}/download`),
  attachmentUrl: (id: string, filename: string) =>
    url(`/email/${encodeURIComponent(id)}/attachment/${encodeURIComponent(filename)}`),
}
