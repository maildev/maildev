/**
 * Deep clone an object using JSON serialization
 * Note: Does not preserve functions, undefined, or circular references
 * @param obj - Object to clone
 * @returns Deep copy of the object
 */
export function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
