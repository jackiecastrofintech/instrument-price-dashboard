import type { TickerEntry } from './hooks/useTickerData'

export type Row = Record<string, number | string>

/** Merge each ticker's series into one row per date, which is the shape Recharts and the table want. */
export function buildRows(tickers: string[], entries: Record<string, TickerEntry>, rebase: boolean): Row[] {
  const byDate = new Map<string, Row>()

  for (const ticker of tickers) {
    const entry = entries[ticker]
    if (entry?.status !== 'ready' || entry.prices.length === 0) continue

    const base = entry.prices[0].price
    for (const point of entry.prices) {
      const row: Row = byDate.get(point.date) ?? { date: point.date }
      row[ticker] = rebase ? (point.price / base) * 100 : point.price
      byDate.set(point.date, row)
    }
  }

  return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

// Dates are "YYYY-MM-DD"; format in UTC so the calendar day never shifts with the viewer's timezone.
const format = (opts: Intl.DateTimeFormatOptions) => (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts })

export const formatTickDate = format({ month: 'short', day: 'numeric' })
export const formatFullDate = format({ month: 'short', day: 'numeric', year: 'numeric' })
