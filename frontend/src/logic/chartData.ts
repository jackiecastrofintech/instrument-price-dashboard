import type { TickerEntry } from '../types'

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

const NICE_MULTIPLIERS = [1, 2, 2.5, 5]
const MAX_TICKS = 6
const EPSILON = 1e-9

export interface YAxisTicks {
  ticks: number[]
  /** Decimals every label needs so that each tick is shown exactly; identical across the axis. */
  decimals: number
}

/**
 * Y-axis ticks for the plotted values, chosen so the labels are distinct and exact.
 * The step is the smallest "nice" one ({1, 2, 2.5, 5} x 10^k) that needs at most six ticks, and
 * `decimals` is the fewest decimals that write that step exactly, so wide ranges stay whole numbers
 * while narrow ones (9.39 to 10.16) get 9.2, 9.4, 9.6... and never round two ticks to the same label.
 * Returns no ticks when there are no values; a flat series is padded so it still has an axis.
 */
export function yAxisTicks(rows: Row[], tickers: string[]): YAxisTicks {
  let min = Infinity
  let max = -Infinity
  for (const row of rows) {
    for (const ticker of tickers) {
      const value = row[ticker]
      if (typeof value === 'number' && Number.isFinite(value)) {
        min = Math.min(min, value)
        max = Math.max(max, value)
      }
    }
  }
  if (min === Infinity) return { ticks: [], decimals: 0 }

  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1
    min -= pad
    max += pad
  }

  const exponent = Math.floor(Math.log10(max - min))
  for (let k = exponent - 2; k <= exponent + 1; k++) {
    for (const multiplier of NICE_MULTIPLIERS) {
      const step = multiplier * 10 ** k
      const first = Math.floor(min / step + EPSILON)
      const last = Math.ceil(max / step - EPSILON)
      const count = last - first + 1
      if (count > MAX_TICKS) continue

      const decimals = decimalsFor(step)
      return {
        ticks: Array.from({ length: count }, (_, i) => Number(((first + i) * step).toFixed(decimals))),
        decimals,
      }
    }
  }
  // Unreachable: the last candidate step (10^(exponent+1)) exceeds the span, so it always fits.
  return { ticks: [], decimals: 0 }
}

/** The fewest decimals that write `step` exactly (0.25 -> 2, 0.2 -> 1, 5 -> 0). */
function decimalsFor(step: number): number {
  for (let d = 0; d <= 12; d++) {
    const scaled = step * 10 ** d
    if (Math.abs(scaled - Math.round(scaled)) < EPSILON) return d
  }
  return 12
}

/** Pixel width the Y axis needs for its longest label (never narrower than the original 44). */
export function yAxisWidth({ ticks, decimals }: YAxisTicks): number {
  const longest = Math.max(0, ...ticks.map((t) => t.toFixed(decimals).length))
  return Math.max(44, longest * 7 + 12)
}
