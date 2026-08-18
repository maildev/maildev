import type { Email, StorageQuery } from '../types/index.js'

/**
 * Get nested property values using dot notation
 * Handles arrays by returning all possible values
 * @param obj - Object to traverse
 * @param path - Dot-notation path (e.g., "from.address" or "from.0.address")
 * @returns Array of all values found at the path
 */
function getNestedValues(obj: unknown, path: string): unknown[] {
  const keys = path.split('.')
  let currentValues: unknown[] = [obj]

  for (const key of keys) {
    const nextValues: unknown[] = []
    const numericIndex = /^\d+$/.test(key) ? parseInt(key, 10) : null

    for (const current of currentValues) {
      if (current === null || current === undefined) {
        continue
      }

      if (Array.isArray(current)) {
        if (numericIndex !== null) {
          // Access specific array index
          const value = current[numericIndex]
          if (value !== undefined) {
            nextValues.push(value)
          }
        } else {
          // Try to get the key from each element in the array
          for (const item of current) {
            if (item !== null && item !== undefined && typeof item === 'object') {
              const value = (item as Record<string, unknown>)[key]
              if (value !== undefined) {
                nextValues.push(value)
              }
            }
          }
        }
      } else if (typeof current === 'object') {
        const value = (current as Record<string, unknown>)[key]
        if (value !== undefined) {
          nextValues.push(value)
        }
      }
    }

    currentValues = nextValues
  }

  return currentValues
}

/**
 * Check if a single value matches the expected value
 */
function matchesSingleValue(actual: unknown, expected: unknown): boolean {
  // Direct comparison
  if (actual === expected) {
    return true
  }

  // String contains check (case-insensitive)
  if (typeof actual === 'string' && typeof expected === 'string') {
    return actual.toLowerCase().includes(expected.toLowerCase())
  }

  return false
}

/**
 * Check if any of the actual values match the expected value
 */
function matchesAnyValue(actualValues: unknown[], expected: unknown): boolean {
  return actualValues.some((actual) => matchesSingleValue(actual, expected))
}

/**
 * Filter emails by query criteria
 * Supports dot-notation for nested properties (e.g., "from.address")
 * @param emails - Array of emails to filter
 * @param query - Query object with property paths as keys
 * @returns Filtered array of emails
 */
export function filterEmails(emails: Email[], query: StorageQuery): Email[] {
  if (!query || Object.keys(query).length === 0) {
    return emails
  }

  return emails.filter((email) => {
    for (const [path, expectedValue] of Object.entries(query)) {
      const actualValues = getNestedValues(email, path)
      if (!matchesAnyValue(actualValues, expectedValue)) {
        return false
      }
    }
    return true
  })
}
