import { describe, expect, it } from 'vitest'
import { withSlots, type Selection } from './selection'

const empty: Selection = { tickers: [], slots: {} }

describe('withSlots', () => {
  it('assigns the lowest free slots in order', () => {
    expect(withSlots(empty, ['A', 'B', 'C']).slots).toEqual({ A: 0, B: 1, C: 2 })
  })

  it('keeps a ticker on its color when another is deselected', () => {
    const three = withSlots(empty, ['A', 'B', 'C'])
    const afterRemoval = withSlots(three, ['A', 'C'])
    expect(afterRemoval.slots).toEqual({ A: 0, C: 2 })
  })

  it('reuses the freed slot for the next ticker added', () => {
    const three = withSlots(empty, ['A', 'B', 'C'])
    const two = withSlots(three, ['A', 'C'])
    expect(withSlots(two, ['A', 'C', 'D']).slots).toEqual({ A: 0, C: 2, D: 1 })
  })

  it('does not hand a color to a ticker that is no longer selected', () => {
    const result = withSlots(withSlots(empty, ['A', 'B']), ['B'])
    expect(result.slots).toEqual({ B: 1 })
  })

  it('returns an empty selection when cleared', () => {
    expect(withSlots(withSlots(empty, ['A', 'B']), [])).toEqual({ tickers: [], slots: {} })
  })
})
