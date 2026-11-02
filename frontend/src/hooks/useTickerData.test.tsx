import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../api'
import { prices, stats } from '../test/fixtures'
import { useTickerData } from './useTickerData'

// Keep the real ApiError so tests throw the same errors the client does.
vi.mock('../api', async (importActual) => ({
  ...(await importActual<typeof import('../api')>()),
  fetchPrices: vi.fn(),
  fetchStats: vi.fn(),
}))
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

  describe('when statistics cannot be computed (422)', () => {
    const detail = "'SOLO' has 1 price point; at least 2 are needed to compute statistics."

    it('keeps the prices and records the server message instead of failing the whole ticker', async () => {
      mocked.fetchPrices.mockImplementation(async () => prices(100))
      mocked.fetchStats.mockRejectedValue(new api.ApiError(detail, 422))

      const { result } = renderHook(() => useTickerData(['SOLO']))

      await waitFor(() => expect(result.current.entries.SOLO?.status).toBe('ready'))
      expect(result.current.entries.SOLO).toEqual({
        status: 'ready',
        prices: prices(100),
        stats: null,
        statsMessage: detail,
      })
    })

    it('still treats a 422 on the prices call as a failure', async () => {
      mocked.fetchPrices.mockRejectedValue(new api.ApiError('bad', 422))
      const { result } = renderHook(() => useTickerData(['SOLO']))
      await waitFor(() => expect(result.current.entries.SOLO).toEqual({ status: 'error', message: 'bad' }))
    })
  })

  it('still fails the whole ticker when the stats call returns a 500', async () => {
    mocked.fetchStats.mockRejectedValue(new api.ApiError('Request failed (HTTP 500)', 500))
    const { result } = renderHook(() => useTickerData(['A']))
    await waitFor(() =>
      expect(result.current.entries.A).toEqual({ status: 'error', message: 'Request failed (HTTP 500)' }),
    )
  })

  it('still fails the whole ticker when the stats call cannot reach the API (no status)', async () => {
    mocked.fetchStats.mockRejectedValue(new api.ApiError('Cannot reach the API', null))
    const { result } = renderHook(() => useTickerData(['A']))
    await waitFor(() => expect(result.current.entries.A?.status).toBe('error'))
  })

  it('records stats as present, with no message, on success', async () => {
    const { result } = renderHook(() => useTickerData(['A']))
    await waitFor(() => expect(result.current.entries.A?.status).toBe('ready'))
    expect(result.current.entries.A).toMatchObject({ stats: stats('A'), statsMessage: null })
  })
})
