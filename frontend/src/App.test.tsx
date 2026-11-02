import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './api'
import { TICKERS, prices, stats } from './test/fixtures'

vi.mock('./api', () => ({
  fetchInstruments: vi.fn(),
  fetchPrices: vi.fn(),
  fetchStats: vi.fn(),
}))
// Recharts needs real layout, which jsdom doesn't have; the chart itself is not under test here.
vi.mock('./components/PriceChart', () => ({ PriceChart: () => null }))

const mocked = vi.mocked(api)

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  mocked.fetchInstruments.mockResolvedValue(TICKERS)
  mocked.fetchPrices.mockImplementation(async () => prices(100, 110))
  mocked.fetchStats.mockImplementation(async (ticker: string) => stats(ticker))
})

const searchBox = () => screen.getByRole('searchbox', { name: 'Search tickers' })
const row = (ticker: string) => screen.getByRole('checkbox', { name: ticker })
const tile = (ticker: string) => screen.getByRole('heading', { level: 3, name: ticker }).closest('section')!

async function loaded() {
  render(<App />)
  await screen.findByText('TICK0001')
}

describe('App: loading the instrument list', () => {
  it('shows a loading state, then the tickers', async () => {
    render(<App />)
    expect(screen.getByText('Loading instruments…')).toBeInTheDocument()
    expect(await screen.findByText('TICK0001')).toBeInTheDocument()
    expect(screen.getByText(`${TICKERS.length} of ${TICKERS.length}`)).toBeInTheDocument()
  })

  it('shows the error and recovers on Retry', async () => {
    mocked.fetchInstruments.mockRejectedValueOnce(new Error('Cannot reach the API. Is the backend running?'))
    render(<App />)
    expect(await screen.findByText('Cannot reach the API. Is the backend running?')).toBeInTheDocument()
    expect(searchBox()).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('TICK0001')).toBeInTheDocument()
  })
})

describe('App: searching and selecting', () => {
  it('filters the list as you type', async () => {
    await loaded()
    await userEvent.type(searchBox(), '0010')
    expect(screen.getByText('1 of 6')).toBeInTheDocument()
    expect(row('TICK0010')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'TICK0001' })).not.toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    await loaded()
    await userEvent.type(searchBox(), 'zzz')
    expect(screen.getByText('No tickers match your search.')).toBeInTheDocument()
  })

  it('shows the empty state until something is selected', async () => {
    await loaded()
    expect(screen.getByText('No tickers selected')).toBeInTheDocument()
  })

  it('shows stats for a clicked ticker', async () => {
    await loaded()
    await userEvent.click(screen.getByText('TICK0002'))
    const t = tile('TICK0002')
    expect(await within(t).findByText('+10.00%')).toBeInTheDocument()
    expect(within(t).getByText('1.50%')).toBeInTheDocument()
    expect(mocked.fetchPrices).toHaveBeenCalledWith('TICK0002')
  })

  it('shows a per-ticker error without breaking the others', async () => {
    mocked.fetchStats.mockImplementation(async (ticker: string) => {
      if (ticker === 'TICK0002') throw new Error("Unknown ticker 'TICK0002'")
      return stats(ticker)
    })
    await loaded()
    await userEvent.type(searchBox(), '1, 2{Enter}')

    expect(await within(tile('TICK0002')).findByText("Unknown ticker 'TICK0002'")).toBeInTheDocument()
    expect(await within(tile('TICK0001')).findByText('+10.00%')).toBeInTheDocument()
  })

  it('shows a legend only when comparing two or more', async () => {
    await loaded()
    await userEvent.click(screen.getByText('TICK0001'))
    expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByText('TICK0002'))
    expect(screen.getByRole('list', { name: 'Legend' })).toBeInTheDocument()
  })
})

describe('App: Enter to select', () => {
  it('selects a ticker by full name or by number', async () => {
    await loaded()
    await userEvent.type(searchBox(), 'tick0001{Enter}')
    await userEvent.type(searchBox(), '2{Enter}')

    expect(await screen.findByRole('heading', { level: 3, name: 'TICK0001' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'TICK0002' })).toBeInTheDocument()
    expect(searchBox()).toHaveValue('')
  })

  it('selects several tickers from a comma-separated list', async () => {
    await loaded()
    await userEvent.type(searchBox(), 'TICK0002, 3, 0004{Enter}')
    expect(await screen.findByText('3/3 selected')).toBeInTheDocument()
  })

  it('keeps text that did not match so the user can fix it', async () => {
    await loaded()
    await userEvent.type(searchBox(), 'zzz, 2{Enter}')
    expect(await screen.findByRole('heading', { level: 3, name: 'TICK0002' })).toBeInTheDocument()
    expect(searchBox()).toHaveValue('zzz')
  })
})

describe('App: the 3-ticker limit', () => {
  async function selectThree() {
    await loaded()
    await userEvent.type(searchBox(), '1, 2, 3{Enter}')
    await screen.findByText('3/3 selected')
  }

  it('shows a Max badge once three are selected', async () => {
    await loaded()
    await userEvent.type(searchBox(), '1, 2{Enter}')
    expect(screen.queryByText('Max')).not.toBeInTheDocument()

    await userEvent.type(searchBox(), '3{Enter}')
    expect(await screen.findByText('Max')).toBeInTheDocument()
  })

  it('disables the other tickers at the limit', async () => {
    await selectThree()
    await userEvent.clear(searchBox())
    expect(row('TICK0004')).toBeDisabled()
    expect(row('TICK0001')).toBeEnabled()
  })

  it('flags a blocked add: badge flashes, text stays, screen readers are told', async () => {
    await selectThree()
    expect(screen.getByText('Max')).not.toHaveClass('hit')

    await userEvent.type(searchBox(), '4{Enter}')
    expect(screen.getByText('Max')).toHaveClass('hit')
    expect(searchBox()).toHaveValue('4')
    expect(screen.getByRole('status')).toHaveTextContent('Maximum of 3 tickers selected')
    expect(screen.queryByRole('heading', { level: 3, name: 'TICK0004' })).not.toBeInTheDocument()
  })
})

describe('App: clearing the selection', () => {
  it('has no Clear link when nothing is selected', async () => {
    await loaded()
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('clears everything from the sidebar link', async () => {
    await loaded()
    await userEvent.type(searchBox(), '1, 2{Enter}')
    await screen.findByText('2/3 selected')

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByText('No tickers selected')).toBeInTheDocument()
    expect(screen.getByText('0/3 selected')).toBeInTheDocument()
  })

  it('clears everything from the toolbar button', async () => {
    await loaded()
    await userEvent.type(searchBox(), '1, 2{Enter}')
    await userEvent.click(await screen.findByRole('button', { name: 'Clear selection' }))
    expect(screen.getByText('No tickers selected')).toBeInTheDocument()
  })

  it('removes just one ticker from its tile', async () => {
    await loaded()
    await userEvent.type(searchBox(), '1, 2{Enter}')
    await screen.findByRole('heading', { level: 3, name: 'TICK0002' })

    await userEvent.click(within(tile('TICK0002')).getByRole('button', { name: 'Remove TICK0002' }))
    expect(screen.queryByRole('heading', { level: 3, name: 'TICK0002' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'TICK0001' })).toBeInTheDocument()
  })
})

describe('App: chart options', () => {
  it('switches between Chart and Table views', async () => {
    await loaded()
    await userEvent.click(screen.getByText('TICK0001'))

    const chart = await screen.findByRole('button', { name: 'Chart' })
    expect(chart).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Table' }))
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('retitles the chart when indexing to 100', async () => {
    await loaded()
    await userEvent.click(screen.getByText('TICK0001'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Closing price' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Index to 100' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Indexed price (start = 100)' })).toBeInTheDocument()
  })

  it('shows the date range of the data', async () => {
    await loaded()
    await userEvent.click(screen.getByText('TICK0001'))
    expect(await screen.findByText('Jan 1, 2026 – Jan 2, 2026')).toBeInTheDocument()
  })
})

describe('App: theme', () => {
  it('defaults to dark and toggles to light, remembering the choice', async () => {
    await loaded()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
  })
})
