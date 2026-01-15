const UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB']

/**
 * Format bytes into a human-readable string
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "2.5 KB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  if (bytes < 0) return '0 Bytes'

  const k = 1024
  const dm = Math.max(0, decimals)
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const unitIndex = Math.min(i, UNITS.length - 1)

  const value = bytes / Math.pow(k, unitIndex)
  return `${parseFloat(value.toFixed(dm))} ${UNITS[unitIndex]}`
}
