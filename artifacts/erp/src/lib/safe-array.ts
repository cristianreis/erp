/**
 * Safely coerce a value to an array.
 * When the backend is unreachable, React Query hooks may return
 * non-array data (e.g. error objects or HTML strings parsed as text).
 * This helper ensures we always work with a real array.
 */
export function safeArray<T = any>(data: unknown): T[] {
  return Array.isArray(data) ? data : [];
}
