import type { TickerEntry } from '../hooks/useTickerData'
import { SERIES_COLORS } from './PriceChart'

interface Props {
  tickers: string[]
  entries: Record<string, TickerEntry>
  onRetry: (ticker: string) => void
}

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function StatsPanel({ tickers, entries, onRetry }: Props) {
  return (
    <div className="stats-grid">
      {tickers.map((ticker, i) => {
        const entry = entries[ticker]
        const color = SERIES_COLORS[i % SERIES_COLORS.length]

        return (
          <div className="stat-card" key={ticker} style={{ borderTopColor: color }}>
            <h3>{ticker}</h3>

            {(!entry || entry.status === 'loading') && <p className="muted">Loading…</p>}

            {entry?.status === 'error' && (
              <div className="error-box small">
                <p>{entry.message}</p>
                <button onClick={() => onRetry(ticker)}>Retry</button>
              </div>
            )}

            {entry?.status === 'ready' && (
              <dl>
                <dt>Total return</dt>
                <dd className={entry.stats.totalReturnPct >= 0 ? 'pos' : 'neg'}>
                  {signed(entry.stats.totalReturnPct)}
                </dd>
                <dt>Daily volatility</dt>
                <dd>{entry.stats.dailyVolatilityPct.toFixed(2)}%</dd>
                <dt>Max drawdown</dt>
                <dd>{entry.stats.maxDrawdownPct.toFixed(2)}%</dd>
              </dl>
            )}
          </div>
        )
      })}
    </div>
  )
}
