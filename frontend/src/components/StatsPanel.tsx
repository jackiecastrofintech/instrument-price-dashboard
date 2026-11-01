import type { TickerEntry } from '../hooks/useTickerData'

interface Props {
  tickers: string[]
  entries: Record<string, TickerEntry>
  colors: Record<string, string>
  onRetry: (ticker: string) => void
}

// Sign is always shown (and uses a true minus) so direction never depends on color alone.
function signed(value: number) {
  const text = Math.abs(value).toFixed(2)
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${text}%`
}

export function StatsPanel({ tickers, entries, colors, onRetry }: Props) {
  return (
    <div className="stats-grid">
      {tickers.map((ticker) => {
        const entry = entries[ticker]

        return (
          <section className="tile" key={ticker}>
            <h3 className="tile-title">
              <span className="key" style={{ background: colors[ticker] }} />
              {ticker}
            </h3>

            {(!entry || entry.status === 'loading') && <p className="muted">Loading…</p>}

            {entry?.status === 'error' && (
              <div className="error-box small">
                <p>{entry.message}</p>
                <button onClick={() => onRetry(ticker)}>Retry</button>
              </div>
            )}

            {entry?.status === 'ready' && (
              <dl className="tile-stats">
                <div>
                  <dt>Total return</dt>
                  <dd className={entry.stats.totalReturnPct >= 0 ? 'pos' : 'neg'}>
                    {signed(entry.stats.totalReturnPct)}
                  </dd>
                </div>
                <div>
                  <dt>Daily volatility</dt>
                  <dd>{entry.stats.dailyVolatilityPct.toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>Max drawdown</dt>
                  <dd>{entry.stats.maxDrawdownPct.toFixed(2)}%</dd>
                </div>
              </dl>
            )}
          </section>
        )
      })}
    </div>
  )
}
