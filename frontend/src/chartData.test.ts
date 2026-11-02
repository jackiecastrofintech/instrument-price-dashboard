import { describe, expect, it } from 'vitest'
import { buildRows, formatFullDate, formatTickDate } from './chartData'
import { ready } from './test/fixtures'

describe('buildRows', () => {
  it('merges tickers into one row per date, sorted by date', () => {
    const rows = buildRows(['A', 'B'], { A: ready('A', [10, 20]), B: ready('B', [100, 200]) }, false)
    expect(rows).toEqual([
      { date: '2026-01-01', A: 10, B: 100 },
      { date: '2026-01-02', A: 20, B: 200 },
    ])
  })

  it('indexes each series to 100 at its own first price', () => {
    const rows = buildRows(['A', 'B'], { A: ready('A', [50, 55, 45]), B: ready('B', [400, 440, 360]) }, true)
    for (const key of ['A', 'B']) {
      const values = rows.map((r) => r[key] as number)
      expect(values[0]).toBe(100)
      expect(values[1]).toBeCloseTo(110, 6)
      expect(values[2]).toBeCloseTo(90, 6)
    }
  })

  it('skips tickers that are loading or failed', () => {
    const rows = buildRows(
      ['A', 'B', 'C'],
      { A: ready('A', [1, 2]), B: { status: 'loading' }, C: { status: 'error', message: 'x' } },
      false,
    )
    expect(rows).toHaveLength(2)
    expect(Object.keys(rows[0]).sort()).toEqual(['A', 'date'])
  })

  it('returns no rows when nothing is ready', () => {
    expect(buildRows(['A'], {}, false)).toEqual([])
  })
})

describe('date formatting', () => {
  it('formats short and full dates without shifting the calendar day', () => {
    expect(formatTickDate('2026-06-23')).toBe('Jun 23')
    expect(formatFullDate('2026-06-23')).toBe('Jun 23, 2026')
    expect(formatFullDate('2026-01-01')).toBe('Jan 1, 2026')
  })
})
