import { describe, expect, it } from 'vitest'
import {
  buildRows,
  formatFullDate,
  formatTickDate,
  yAxisTicks,
  yAxisWidth,
  type Row,
  type YAxisTicks,
} from './chartData'
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

/** One row per value, so a series [lo, hi] is enough to define a price range. */
const rowsOf = (key: string, values: number[]): Row[] =>
  values.map((v, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, [key]: v }))

const labelsOf = ({ ticks, decimals }: YAxisTicks) => ticks.map((t) => t.toFixed(decimals))

/** The requirements every axis must meet, whatever the data. */
function expectGoodAxis(axis: YAxisTicks, min: number, max: number) {
  const labels = labelsOf(axis)

  expect(axis.ticks.length).toBeGreaterThanOrEqual(2)
  expect(axis.ticks.length).toBeLessThanOrEqual(6)
  expect(new Set(labels).size).toBe(labels.length) // distinct
  labels.forEach((label, i) => expect(Number(label)).toBe(axis.ticks[i])) // exact: nothing rounded
  labels.forEach((label) => expect(label.split('.')[1]?.length ?? 0).toBe(axis.decimals)) // same decimals
  axis.ticks.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(axis.ticks[i])) // increasing
  expect(axis.ticks[0]).toBeLessThanOrEqual(min) // covers the data
  expect(axis.ticks[axis.ticks.length - 1]).toBeGreaterThanOrEqual(max)
}

describe('yAxisTicks', () => {
  it('gives distinct, exact labels for TICK0122 (9.39 to 10.16)', () => {
    const axis = yAxisTicks(rowsOf('T', [9.39, 10.16]), ['T'])
    expectGoodAxis(axis, 9.39, 10.16)
    expect(axis.ticks).toEqual([9.2, 9.4, 9.6, 9.8, 10, 10.2])
    expect(labelsOf(axis)).toEqual(['9.2', '9.4', '9.6', '9.8', '10.0', '10.2'])
  })

  it('gives distinct, exact labels for TICK0195 (9.89 to 11.31)', () => {
    const axis = yAxisTicks(rowsOf('T', [9.89, 11.31]), ['T'])
    expectGoodAxis(axis, 9.89, 11.31)
    expect(labelsOf(axis)).toEqual(['9.5', '10.0', '10.5', '11.0', '11.5'])
  })

  it('gives distinct, exact labels for TICK0154 (17.67 to 19.00)', () => {
    const axis = yAxisTicks(rowsOf('T', [17.67, 19]), ['T'])
    expectGoodAxis(axis, 17.67, 19)
    expect(labelsOf(axis)).toEqual(['17.5', '18.0', '18.5', '19.0'])
  })

  it('uses a quarter step when that is the fewest decimals that works, without rounding 9.25', () => {
    const axis = yAxisTicks(rowsOf('T', [9.3, 10.2]), ['T'])
    expectGoodAxis(axis, 9.3, 10.2)
    expect(axis.ticks.every((t) => Number(t.toFixed(axis.decimals)) === t)).toBe(true)
    // Any 0.25 step must show two decimals, never "9.3" for 9.25.
    if (axis.ticks.includes(9.25)) expect(axis.decimals).toBe(2)
  })

  it('keeps whole numbers for wide ranges', () => {
    const axis = yAxisTicks(rowsOf('T', [150, 560]), ['T'])
    expectGoodAxis(axis, 150, 560)
    expect(axis.decimals).toBe(0)
    expect(axis.ticks.every(Number.isInteger)).toBe(true)
  })

  it('keeps whole numbers for thousands', () => {
    const axis = yAxisTicks(rowsOf('T', [1200, 4800]), ['T'])
    expectGoodAxis(axis, 1200, 4800)
    expect(axis.decimals).toBe(0)
  })

  it.each([
    [99.2, 100.9],
    [90, 110],
    [99.9, 100.1],
    [100, 108.2],
  ])('handles values close to 100 (%f to %f)', (lo, hi) => {
    expectGoodAxis(yAxisTicks(rowsOf('T', [lo, hi]), ['T']), lo, hi)
  })

  it('works with Index to 100', () => {
    const entries = { T: ready('T', [9.39, 9.8, 10.16]) }
    const rows = buildRows(['T'], entries, true)
    const axis = yAxisTicks(rows, ['T'])

    expectGoodAxis(axis, 100, (10.16 / 9.39) * 100)
    expect(axis.ticks.every((t) => t >= 90 && t <= 115)).toBe(true)
  })

  it('pads a flat range so it still has an axis', () => {
    const axis = yAxisTicks(rowsOf('T', [100, 100, 100]), ['T'])
    expectGoodAxis(axis, 100, 100)
    expect(axis.ticks).toContain(100)
  })

  it('pads a flat range of zero', () => {
    expectGoodAxis(yAxisTicks(rowsOf('T', [0, 0]), ['T']), 0, 0)
  })

  it('handles a single point', () => {
    expectGoodAxis(yAxisTicks(rowsOf('T', [9.75]), ['T']), 9.75, 9.75)
  })

  it('returns no ticks for empty input', () => {
    expect(yAxisTicks([], ['T'])).toEqual({ ticks: [], decimals: 0 })
    expect(yAxisTicks(rowsOf('T', [1, 2]), [])).toEqual({ ticks: [], decimals: 0 })
    expect(yAxisTicks(rowsOf('T', [1, 2]), ['OTHER'])).toEqual({ ticks: [], decimals: 0 })
  })

  it('ignores values that are not finite numbers', () => {
    const rows: Row[] = [{ date: 'a', T: Number.NaN }, { date: 'b', T: 9.39 }, { date: 'c', T: 10.16 }]
    expectGoodAxis(yAxisTicks(rows, ['T']), 9.39, 10.16)
  })

  it('spans every plotted ticker, not just one', () => {
    const rows = [...rowsOf('A', [9.39, 10.16]), ...rowsOf('B', [17.67, 19])]
    const axis = yAxisTicks(rows, ['A', 'B'])
    expectGoodAxis(axis, 9.39, 19)
  })

  it('only considers the tickers it is given', () => {
    const rows = [...rowsOf('A', [9.39, 10.16]), ...rowsOf('B', [500, 900])]
    const axis = yAxisTicks(rows, ['A'])
    expectGoodAxis(axis, 9.39, 10.16)
    expect(axis.ticks[axis.ticks.length - 1]).toBeLessThan(20)
  })
})

describe('yAxisWidth', () => {
  it('keeps the original width for short labels', () => {
    expect(yAxisWidth({ ticks: [150, 300, 450], decimals: 0 })).toBe(44)
  })

  it('widens for longer labels', () => {
    expect(yAxisWidth({ ticks: [1000.5, 2000.5], decimals: 1 })).toBeGreaterThan(44)
  })

  it('is safe with no ticks', () => {
    expect(yAxisWidth({ ticks: [], decimals: 0 })).toBe(44)
  })
})
