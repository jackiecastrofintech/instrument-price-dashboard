import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ready } from '../test/fixtures'
import { StatsPanel } from './StatsPanel'

const colors = { A: 'var(--series-1)', B: 'var(--series-2)' }

function renderPanel(entries: Parameters<typeof StatsPanel>[0]['entries'], tickers = ['A']) {
  const onRetry = vi.fn()
  const onRemove = vi.fn()
  render(<StatsPanel tickers={tickers} entries={entries} colors={colors} onRetry={onRetry} onRemove={onRemove} />)
  return { onRetry, onRemove }
}

describe('StatsPanel', () => {
  it('shows the three stats formatted to two decimals', () => {
    renderPanel({ A: ready('A', [1, 2], { totalReturnPct: 12.345, dailyVolatilityPct: 1.5, maxDrawdownPct: 3.2 }) })
    expect(screen.getByText('+12.35%')).toBeInTheDocument()
    expect(screen.getByText('1.50%')).toBeInTheDocument()
    expect(screen.getByText('3.20%')).toBeInTheDocument()
  })

  it('always shows a sign on returns and uses a true minus for losses', () => {
    renderPanel(
      { A: ready('A', [1, 2], { totalReturnPct: -9.167 }), B: ready('B', [1, 2], { totalReturnPct: 0 }) },
      ['A', 'B'],
    )
    expect(screen.getByText('−9.17%')).toHaveClass('neg')
    expect(screen.getByText('0.00%')).toHaveClass('pos')
  })

  it('marks gains as positive', () => {
    renderPanel({ A: ready('A', [1, 2], { totalReturnPct: 4 }) })
    expect(screen.getByText('+4.00%')).toHaveClass('pos')
  })

  it('shows a loading state before data arrives', () => {
    renderPanel({ A: { status: 'loading' } })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    renderPanel({}) // no entry yet counts as loading too
    expect(screen.getAllByText('Loading…')).toHaveLength(2)
  })

  it('shows the error and lets the user retry', async () => {
    const { onRetry } = renderPanel({ A: { status: 'error', message: 'Cannot reach the API' } })
    expect(screen.getByText('Cannot reach the API')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledWith('A')
  })

  it('removes a single ticker from its tile', async () => {
    const { onRemove } = renderPanel({ A: ready('A', [1, 2]), B: ready('B', [1, 2]) }, ['A', 'B'])
    const tileB = screen.getByRole('heading', { name: 'B' }).closest('section')!
    await userEvent.click(within(tileB).getByRole('button', { name: 'Remove B' }))
    expect(onRemove).toHaveBeenCalledWith('B')
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
