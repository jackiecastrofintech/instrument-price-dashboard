import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetchInstruments, fetchPrices, fetchStats } from './api'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(['TICK0001', 'TICK0002'])))
    await expect(fetchInstruments()).resolves.toEqual(['TICK0001', 'TICK0002'])
  })

  it('encodes the ticker in the URL', async () => {
    // A fresh Response per call: a body can only be read once.
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(json([])))
    vi.stubGlobal('fetch', fetchMock)
    await fetchPrices('A/B')
    await fetchStats('A B')
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/prices\/A%2FB$/)
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/prices\/A%20B\/stats$/)
  })

  it('uses the ProblemDetails detail as the error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(json({ title: 'Unknown ticker', status: 404, detail: "Unknown ticker 'NOPE'" }, 404)),
    )
    const error = await fetchPrices('NOPE').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe("Unknown ticker 'NOPE'")
    expect((error as ApiError).status).toBe(404)
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    const error = await fetchInstruments().catch((e: unknown) => e)
    expect((error as ApiError).message).toBe('Request failed (HTTP 500)')
    expect((error as ApiError).status).toBe(500)
  })

  it('reports an unreachable API clearly, with no status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await fetchInstruments().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toMatch(/Cannot reach the API/)
    expect((error as ApiError).status).toBeNull()
  })
})
