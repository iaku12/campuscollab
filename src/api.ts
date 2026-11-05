export type User = {
  id: number
  name: string
  email: string
  role: 'student' | 'coordinator'
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error ?? 'Something went wrong.')
  return data as T
}