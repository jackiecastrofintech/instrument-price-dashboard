import { describe, expect, it } from 'vitest'
import { filterTickers, planSelection, resolveToken } from './tickerSearch'
import { TICKERS } from '../test/fixtures'

describe('resolveToken', () => {
  it('matches an exact ticker, ignoring case and whitespace', () => {
    expect(resolveToken('tick0001', TICKERS)).toBe('TICK0001')
    expect(resolveToken('  TICK0002 ', TICKERS)).toBe('TICK0002')
  })

  it('matches by number, with or without leading zeros', () => {
    expect(resolveToken('0001', TICKERS)).toBe('TICK0001')
    expect(resolveToken('1', TICKERS)).toBe('TICK0001')
    expect(resolveToken('20', TICKERS)).toBe('TICK0020')
  })

  it('does not confuse 1 with 10', () => {
    expect(resolveToken('1', TICKERS)).toBe('TICK0001')
    expect(resolveToken('10', TICKERS)).toBe('TICK0010')
  })

  it('accepts a partial match only when it is unique', () => {
    expect(resolveToken('K0020', TICKERS)).toBe('TICK0020')
    expect(resolveToken('TICK00', TICKERS)).toBeUndefined() // matches many
  })

  it('returns undefined for empty or unknown input', () => {
    expect(resolveToken('', TICKERS)).toBeUndefined()
    expect(resolveToken('   ', TICKERS)).toBeUndefined()
    expect(resolveToken('zzz', TICKERS)).toBeUndefined()
    expect(resolveToken('999', TICKERS)).toBeUndefined()
  })
})

describe('filterTickers', () => {
  it('returns everything for an empty query', () => {
    expect(filterTickers('', TICKERS)).toEqual(TICKERS)
  })

  it('filters by substring, case-insensitively', () => {
    expect(filterTickers('tick001', TICKERS)).toEqual(['TICK0010'])
  })

  it('filters on the token after the last comma', () => {
    expect(filterTickers('TICK0001, 002', TICKERS)).toEqual(['TICK0002', 'TICK0020'])
    expect(filterTickers('TICK0001, ', TICKERS)).toEqual(TICKERS)
  })
})

describe('planSelection', () => {
  it('adds every ticker in a comma-separated list, in typed order', () => {
    const plan = planSelection('tick0002, 3, 0004', TICKERS, [], 3)
    expect(plan).toEqual({ added: ['TICK0002', 'TICK0003', 'TICK0004'], leftover: [], hitLimit: false })
  })

  it('leaves unmatched tokens in the box', () => {
    const plan = planSelection('zzz, 2', TICKERS, [], 3)
    expect(plan.added).toEqual(['TICK0002'])
    expect(plan.leftover).toEqual(['zzz'])
    expect(plan.hitLimit).toBe(false)
  })

  it('adds what fits and keeps the rest when over the limit', () => {
    const plan = planSelection('3, 4, 10', TICKERS, ['TICK0001', 'TICK0002'], 3)
    expect(plan.added).toEqual(['TICK0003'])
    expect(plan.leftover).toEqual(['4', '10'])
    expect(plan.hitLimit).toBe(true)
  })

  it('reports hitLimit and adds nothing when already full', () => {
    const plan = planSelection('4', TICKERS, ['TICK0001', 'TICK0002', 'TICK0003'], 3)
    expect(plan).toEqual({ added: [], leftover: ['4'], hitLimit: true })
  })

  it('ignores tickers that are already selected or repeated, without flagging the limit', () => {
    const plan = planSelection('1, 1, 2, 2', TICKERS, ['TICK0001'], 3)
    expect(plan.added).toEqual(['TICK0002'])
    expect(plan.leftover).toEqual([])
    expect(plan.hitLimit).toBe(false)
  })

  it('does nothing for blank input', () => {
    expect(planSelection('  , ,', TICKERS, [], 3)).toEqual({ added: [], leftover: [], hitLimit: false })
  })
})
