import type { PricePoint, TickerStats } from './types'

// Backend address. Override with VITE_API_URL in frontend/.env if you change the port.
const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:5080'

export class ApiError extends Error {
  status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`)
  } catch {
    // fetch only throws on network-level failures (server down, wrong port, CORS block)
    throw new ApiError(`Cannot reach the API at ${API_URL}. Is the backend running?`)
  }

  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`
    try {
      const body = await res.json()
      // Backend returns RFC 7807 ProblemDetails; `detail` carries the human-readable message.
      if (body && typeof body.detail === 'string') message = body.detail
    } catch {
      // response had no JSON body; keep the generic message
    }
    throw new ApiError(message, res.status)
  }

  return (await res.json()) as T
}

export const fetchInstruments = () => getJson<string[]>('/api/instruments')

export const fetchPrices = (ticker: string) =>
  getJson<PricePoint[]>(`/api/prices/${encodeURIComponent(ticker)}`)

export const fetchStats = (ticker: string) =>
  getJson<TickerStats>(`/api/prices/${encodeURIComponent(ticker)}/stats`)
