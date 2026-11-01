import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TickerEntry } from '../hooks/useTickerData'

// Theme-aware colors defined in index.css.
export const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']

interface Props {
  tickers: string[]
  entries: Record<string, TickerEntry>
  rebase: boolean
}

type Row = Record<string, number | string>

/** Merge each ticker's series into one row per date, which is the shape Recharts wants. */
function buildRows(tickers: string[], entries: Record<string, TickerEntry>, rebase: boolean): Row[] {
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

export function PriceChart({ tickers, entries, rebase }: Props) {
  const rows = buildRows(tickers, entries, rebase)
  const readyTickers = tickers.filter((t) => entries[t]?.status === 'ready')

  if (readyTickers.length === 0) {
    return <div className="chart-placeholder muted">Loading chart…</div>
  }

  return (
    <div className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted)' }} stroke="var(--border-strong)" minTickGap={24} />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            stroke="var(--border-strong)"
            tickFormatter={(v: number) => v.toFixed(0)}
            width={48}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', color: 'var(--text)' }}
            labelStyle={{ color: 'var(--text)' }}
            formatter={(value) => (typeof value === 'number' ? value.toFixed(2) : String(value ?? ''))}
          />
          <Legend />
          {tickers.map((ticker, i) =>
            entries[ticker]?.status === 'ready' ? (
              <Line
                key={ticker}
                type="monotone"
                dataKey={ticker}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ) : null,
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
