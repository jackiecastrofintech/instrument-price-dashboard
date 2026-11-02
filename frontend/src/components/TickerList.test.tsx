import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TickerList } from './TickerList'

const colors = { A: 'var(--series-1)', B: 'var(--series-2)', C: 'var(--series-3)' }

function renderList(props: Partial<Parameters<typeof TickerList>[0]> = {}) {
  const onToggle = vi.fn()
  render(
    <TickerList tickers={['A', 'B', 'C', 'D']} selected={[]} colors={colors} maxSelected={3} onToggle={onToggle} {...props} />,
  )
  return { onToggle }
}

describe('TickerList', () => {
  it('lists every ticker as a checkbox', () => {
    renderList()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
  })

  it('toggles a ticker when its row is clicked', async () => {
    const { onToggle } = renderList()
    await userEvent.click(screen.getByText('B'))
    expect(onToggle).toHaveBeenCalledWith('B')
  })

  it('reflects which tickers are selected', () => {
    renderList({ selected: ['A', 'C'] })
    expect(screen.getByRole('checkbox', { name: 'A' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'B' })).not.toBeChecked()
  })

  it('disables unselected tickers once the limit is reached, but keeps selected ones usable', async () => {
    const { onToggle } = renderList({ selected: ['A', 'B', 'C'] })
    expect(screen.getByRole('checkbox', { name: 'D' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'A' })).toBeEnabled()

    await userEvent.click(screen.getByText('D'))
    expect(onToggle).not.toHaveBeenCalled()
    await userEvent.click(screen.getByText('A'))
    expect(onToggle).toHaveBeenCalledWith('A')
  })

  it('tells the user when nothing matches', () => {
    renderList({ tickers: [] })
    expect(screen.getByText('No tickers match your search.')).toBeInTheDocument()
  })
})
