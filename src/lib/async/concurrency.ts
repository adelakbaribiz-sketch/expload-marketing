/**
 * Bounded-concurrency map — runs `fn` over `items` with at most `limit`
 * calls in flight at once, preserving input order in the result array.
 *
 * No dependency added for this (e.g. p-limit): the whole thing is a dozen
 * lines and this project's own convention (see pdfkit vs Playwright in
 * Phase 14) is to only reach for a library when the in-house version
 * would be nontrivial.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0

  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}
