import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api'
import { prices, stats } from '../test/fixtures'
import { useTickerData } from './useTickerData'

vi.mock('../api', () => ({ fetchPrices: vi.fn(), fetchStats: vi.fn() }))
const mocked = vi.mocked(api)

beforeEach(() => {
  vi.resetAllMocks()
  mocked.fetchPrices.mockImplementation(async () => prices(1, 2))
  mocked.fetchStats.mockImplementation(async (t: string) => stats(t))
})

describe('useTickerData', () => {
  it('loads prices and stats for each ticker', async () => {
    const { result } = renderHook(() => useTickerData(['A', 'B']))
    await waitFor(() => {
      expect(result.current.entries.A?.status).toBe('ready')
      expect(result.current.entries.B?.status).toBe('ready')
    })
    expect(mocked.fetchPrices).toHaveBeenCalledTimes(2)
    expect(mocked.fetchStats).toHaveBeenCalledTimes(2)
  })

  it('reports loading while the request is in flight', async () => {
    mocked.fetchPrices.mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(() => useTickerData(['A']))
    await waitFor(() => expect(result.current.entries.A?.status).toBe('loading'))
  })

  it('does not refetch a ticker it already has', async () => {
    const { result, rerender } = renderHook(({ tickers }) => useTickerData(tickers), {
      initialProps: { tickers: ['A'] },
    })
    await waitFor(() => expect(result.current.entries.A?.status).toBe('ready'))

    rerender({ tickers: ['A', 'B'] })
    await waitFor(() => expect(result.current.entries.B?.status).toBe('ready'))
    rerender({ tickers: ['A'] })
    rerender({ tickers: ['A', 'B'] })

    expect(mocked.fetchPrices).toHaveBeenCalledTimes(2) // A once, B once
  })

  it('captures a failure as an error entry with the message', async () => {
    mocked.fetchPrices.mockRejectedValue(new Error("Unknown ticker 'A'"))
    const { result } = renderHook(() => useTickerData(['A']))
    await waitFor(() => expect(result.current.entries.A).toEqual({ status: 'error', message: "Unknown ticker 'A'" }))
  })

  it('retries a failed ticker', async () => {
    mocked.fetchPrices.mockRejectedValueOnce(new Error('boom'))
    const { result } = renderHook(() => useTickerData(['A']))
    await waitFor(() => expect(result.current.entries.A?.status).toBe('error'))

    act(() => result.current.retry('A'))
    await waitFor(() => expect(result.current.entries.A?.status).toBe('ready'))
  })
})
