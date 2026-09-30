/** JSON fetch for our own API: returns ok + parsed body (error code in `error`). */
export async function api<T = Record<string, unknown>>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  return { ok: res.ok, status: res.status, data };
}
