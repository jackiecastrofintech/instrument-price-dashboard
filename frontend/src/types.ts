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
