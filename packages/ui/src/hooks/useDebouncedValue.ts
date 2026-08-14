import { useEffect, useState } from 'react'

/**
 * Follow a value, but only after it has been stable for `delay` ms
 *
 * Used for the search box: search runs on the server now, so reacting to every
 * keystroke would mean a request per character.
 * @param value - Value to track
 * @param delay - How long the value must be stable, in milliseconds
 * @returns The last settled value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
