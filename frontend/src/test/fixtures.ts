import type { TickerEntry } from '../hooks/useTickerData'
import type { PricePoint, TickerStats } from '../types'

export const TICKERS = ['TICK0001', 'TICK0002', 'TICK0003', 'TICK0004', 'TICK0010', 'TICK0020']

export function prices(...values: number[]): PricePoint[] {
  return values.map((price, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, price }))
}

export function stats(ticker: string, overrides: Partial<TickerStats> = {}): TickerStats {
  return { ticker, totalReturnPct: 10, dailyVolatilityPct: 1.5, maxDrawdownPct: 3, ...overrides }
}

export function ready(ticker: string, values: number[], statOverrides: Partial<TickerStats> = {}): TickerEntry {
  return { status: 'ready', prices: prices(...values), stats: stats(ticker, statOverrides), statsMessage: null }
}

/** Prices loaded, but the server said statistics are not available (HTTP 422). */
export function readyWithoutStats(values: number[], message: string): TickerEntry {
  return { status: 'ready', prices: prices(...values), stats: null, statsMessage: message }
}
