const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Generate a random alphanumeric ID
 * @param length - Length of the ID (default: 8)
 * @returns Random alphanumeric string
 */
export function makeId(length: number = 8): string {
  let id = ''
  for (let i = 0; i < length; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return id
}
