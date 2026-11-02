import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPrices, fetchStats } from '../api'
import type { PricePoint, TickerStats } from '../types'

export type TickerEntry =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  /** `stats` is null, with the server's explanation in `statsMessage`, when the prices loaded but statistics are not defined (HTTP 422). */
  | { status: 'ready'; prices: PricePoint[]; stats: TickerStats | null; statsMessage: string | null }

/** Matches by shape rather than `instanceof ApiError`, so it also holds for errors from a mocked client. */
const hasStatus = (err: unknown, status: number) =>
  typeof err === 'object' && err !== null && (err as { status?: unknown }).status === status

/** Statistics can be legitimately unavailable (422) without invalidating the prices; any other failure still throws. */
const fetchStatsOrExplain = (ticker: string) =>
  fetchStats(ticker).then(
    (stats) => ({ stats, message: null }),
    (err: unknown) => {
      if (hasStatus(err, 422)) {
        return { stats: null, message: err instanceof Error ? err.message : 'Statistics are not available' }
      }
      throw err
    },
  )

/**
 * Loads prices + stats for every ticker in `tickers` and caches the results,
 * so re-selecting a ticker doesn't trigger another request.
 */
export function useTickerData(tickers: string[]) {
  const [entries, setEntries] = useState<Record<string, TickerEntry>>({})
  const inFlight = useRef(new Set<string>())

  const load = useCallback((ticker: string) => {
    if (inFlight.current.has(ticker)) return
    inFlight.current.add(ticker)
    setEntries((prev) => ({ ...prev, [ticker]: { status: 'loading' } }))

    Promise.all([fetchPrices(ticker), fetchStatsOrExplain(ticker)])
      .then(([prices, { stats, message }]) =>
        setEntries((prev) => ({
          ...prev,
          [ticker]: { status: 'ready', prices, stats, statsMessage: message },
        })),
      )
      .catch((err: unknown) =>
        setEntries((prev) => ({
          ...prev,
          [ticker]: {
            status: 'error',
            message: err instanceof Error ? err.message : 'Something went wrong',
          },
        })),
      )
      .finally(() => inFlight.current.delete(ticker))
  }, [])

  useEffect(() => {
    for (const ticker of tickers) {
      if (!entries[ticker]) load(ticker)
    }
  }, [tickers, entries, load])

  // Dropping the cached entry makes the effect above fetch it again.
  const retry = useCallback((ticker: string) => {
    setEntries((prev) => {
      const next = { ...prev }
      delete next[ticker]
      return next
    })
  }, [])

  return { entries, retry }
}
