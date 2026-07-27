/**
 * Base-path resolution for the MailDev UI client.
 *
 * MailDev can be mounted under a non-root base path (e.g. behind a reverse
 * proxy at `/mail`). The static server injects a `<base href="{basePath}/">`
 * tag into index.html, so `document.baseURI` reflects the configured base
 * path. We derive the REST API and Socket.io prefixes from it here.
 *
 * In the Vite dev server no `<base>` tag is present and MailDev is served at
 * the root, so this resolves to '' — matching the dev proxy for `/api` and
 * `/socket.io`.
 */

/** Strip trailing slashes: '/mail/' -> '/mail', '/' -> ''. */
function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '')
}

/**
 * The base path the UI is served under, as a prefix without a trailing slash
 * ('' when served at the root).
 */
export function getBasePath(): string {
  if (typeof document === 'undefined') return ''
  return stripTrailingSlash(new URL(document.baseURI).pathname)
}
