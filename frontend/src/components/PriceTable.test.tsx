import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ready } from '../test/fixtures'
import { PriceTable } from './PriceTable'

const colors = { A: 'var(--series-1)', B: 'var(--series-2)' }

describe('PriceTable', () => {
  it('shows one column per ready ticker and one row per date', () => {
    render(
      <PriceTable
        tickers={['A', 'B']}
        entries={{ A: ready('A', [10, 20]), B: ready('B', [100, 200]) }}
        colors={colors}
        rebase={false}
      />,
    )
    expect(screen.getByRole('columnheader', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'B' })).toBeInTheDocument()

    const row = screen.getByRole('row', { name: /Jan 2, 2026/ })
    expect(within(row).getByText('20.00')).toBeInTheDocument()
    expect(within(row).getByText('200.00')).toBeInTheDocument()
  })

  it('shows indexed values when rebased', () => {
    render(<PriceTable tickers={['A']} entries={{ A: ready('A', [50, 55]) }} colors={colors} rebase />)
    expect(screen.getByText('100.00')).toBeInTheDocument()
    expect(screen.getByText('110.00')).toBeInTheDocument()
  })

  it('leaves out tickers that are still loading', () => {
    render(
      <PriceTable tickers={['A', 'B']} entries={{ A: ready('A', [1, 2]), B: { status: 'loading' } }} colors={colors} rebase={false} />,
    )
    expect(screen.queryByRole('columnheader', { name: 'B' })).not.toBeInTheDocument()
  })

  it('shows a loading message when nothing is ready', () => {
    render(<PriceTable tickers={['A']} entries={{}} colors={colors} rebase={false} />)
    expect(screen.getByText('Loading data…')).toBeInTheDocument()
  })
})
