export interface PricePoint {
  date: string // "YYYY-MM-DD"
  price: number
}

export interface TickerStats {
  ticker: string
  totalReturnPct: number
  dailyVolatilityPct: number
  maxDrawdownPct: number
}

export type TickerEntry =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  /** `stats` is null, with the server's explanation in `statsMessage`, when the prices loaded but statistics are not defined (HTTP 422). */
  | { status: 'ready'; prices: PricePoint[]; stats: TickerStats | null; statsMessage: string | null }
