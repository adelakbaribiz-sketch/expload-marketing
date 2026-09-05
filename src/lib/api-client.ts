/**
 * Thin fetch wrapper for client components. Centralizes the boilerplate that
 * was previously copy-pasted at every one of the ~239 `fetch()` call sites
 * across the 62 dashboard views (Content-Type header, `!res.ok` check,
 * `res.json()`) and — unlike most of those call sites — surfaces the
 * backend's actual `{ error: string }` message instead of a generic
 * "failed"/"Failed" string, so the mutation `onError` toast (or the global
 * default in providers.tsx) shows something the user can act on. See
 * FRONTEND-ARCHITECTURE.md "API Layer". Adopted so far in `crm-view.tsx` as
 * a proof of concept — rolling it out to the rest is cataloged as deferred
 * work, not a blind mechanical rewrite of every view in one pass.
 */

async function request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message =
      body && typeof body.error === 'string' ? body.error : `Request failed (${res.status})`
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function apiGet<T = any>(url: string): Promise<T> {
  return request<T>(url)
}

export function apiPost<T = any>(url: string, data?: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined })
}

export function apiPatch<T = any>(url: string, data?: unknown): Promise<T> {
  return request<T>(url, { method: 'PATCH', body: data !== undefined ? JSON.stringify(data) : undefined })
}

export function apiDelete<T = any>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' })
}
