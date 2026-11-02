import { buildRows, formatFullDate } from '../logic/chartData'
import type { TickerEntry } from '../types'

interface Props {
  tickers: string[]
  entries: Record<string, TickerEntry>
  colors: Record<string, string>
  rebase: boolean
}

/** Table view of the chart data: the accessible, exact-values alternative to the plot. */
export function PriceTable({ tickers, entries, colors, rebase }: Props) {
  const ready = tickers.filter((t) => entries[t]?.status === 'ready')
  if (ready.length === 0) return <div className="chart-placeholder muted">Loading data…</div>

  const rows = buildRows(ready, entries, rebase)

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            {ready.map((t) => (
              <th scope="col" key={t} className="num">
                <span className="key" style={{ background: colors[t] }} />
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row.date)}>
              <th scope="row">{formatFullDate(String(row.date))}</th>
              {ready.map((t) => (
                <td key={t} className="num">
                  {typeof row[t] === 'number' ? (row[t] as number).toFixed(2) : '–'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
