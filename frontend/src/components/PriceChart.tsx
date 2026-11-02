import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TooltipContentProps } from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { buildRows, formatFullDate, formatTickDate, yAxisTicks, yAxisWidth } from '../chartData'
import type { TickerEntry } from '../hooks/useTickerData'

interface Props {
  tickers: string[]
  entries: Record<string, TickerEntry>
  colors: Record<string, string>
  rebase: boolean
}

function ChartTooltip({ active, payload, label, colors, order }: Partial<TooltipContentProps<ValueType, NameType>> & {
  colors: Record<string, string>
  order: string[]
}) {
  if (!active || !payload?.length) return null
  // Same order as the legend, not sorted by value.
  const items = [...payload].sort((a, b) => order.indexOf(String(a.dataKey)) - order.indexOf(String(b.dataKey)))
  return (
    <div className="tooltip">
      <div className="tooltip-date">{formatFullDate(String(label))}</div>
      {items.map((item) => (
        <div className="tooltip-row" key={String(item.dataKey)}>
          <span className="key" style={{ background: colors[String(item.dataKey)] }} />
          <span className="tooltip-name">{item.name}</span>
          <span className="tooltip-value">
            {typeof item.value === 'number' ? item.value.toFixed(2) : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PriceChart({ tickers, entries, colors, rebase }: Props) {
  const rows = buildRows(tickers, entries, rebase)
  const ready = tickers.filter((t) => entries[t]?.status === 'ready')
  const yAxis = yAxisTicks(rows, ready)

  if (ready.length === 0) {
    return <div className="chart-placeholder muted">Loading chart…</div>
  }

  return (
    <div className="chart-box" role="img" aria-label={`Line chart of ${ready.join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatTickDate}
            tick={{ fontSize: 12, fill: 'var(--tick)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--axis)' }}
            tickMargin={8}
            minTickGap={32}
          />
          <YAxis
            ticks={yAxis.ticks.length > 0 ? yAxis.ticks : undefined}
            domain={yAxis.ticks.length > 0 ? [yAxis.ticks[0], yAxis.ticks[yAxis.ticks.length - 1]] : ['auto', 'auto']}
            tick={{ fontSize: 12, fill: 'var(--tick)' }}
            tickFormatter={(v: number) => v.toFixed(yAxis.decimals)}
            tickLine={false}
            axisLine={false}
            width={yAxisWidth(yAxis)}
          />
          <Tooltip
            cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
            content={(props) => <ChartTooltip {...props} colors={colors} order={tickers} />}
          />
          {ready.map((ticker) => {
            // A lone point has no line to draw, so show it as a dot.
            const entry = entries[ticker]
            const singlePoint = entry?.status === 'ready' && entry.prices.length === 1
            return (
              <Line
                key={ticker}
                name={ticker}
                type="linear"
                dataKey={ticker}
                stroke={colors[ticker]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={singlePoint ? { r: 4, fill: colors[ticker], stroke: 'var(--surface)', strokeWidth: 2 } : false}
                activeDot={{ r: 4, fill: colors[ticker], stroke: 'var(--surface)', strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
