/**
 * Run an async worker over every item, with at most `limit` calls in flight
 *
 * Filesystem work on a mail directory can involve tens of thousands of entries;
 * a bare `Promise.all` over that opens every file descriptor at once and fails
 * with EMFILE. This keeps the fan-out bounded while still running in parallel.
 * @param items - Items to process
 * @param limit - Maximum number of concurrent workers
 * @param worker - Async function applied to each item
 * @returns Results in the same order as the input
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  const workers = Math.max(1, Math.min(Math.trunc(limit), items.length))
  let next = 0

  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await worker(items[index] as T, index)
      }
    })
  )

  return results
}
