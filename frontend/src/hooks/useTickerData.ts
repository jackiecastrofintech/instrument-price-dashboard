import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPrices, fetchStats } from '../api'
import type { PricePoint, TickerStats } from '../types'

export type TickerEntry =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; prices: PricePoint[]; stats: TickerStats }

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

    Promise.all([fetchPrices(ticker), fetchStats(ticker)])
      .then(([prices, stats]) =>
        setEntries((prev) => ({ ...prev, [ticker]: { status: 'ready', prices, stats } })),
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
