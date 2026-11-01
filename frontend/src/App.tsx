import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchInstruments } from './api'
import { PriceChart } from './components/PriceChart'
import { StatsPanel } from './components/StatsPanel'
import { TickerList } from './components/TickerList'
import { useTheme } from './hooks/useTheme'
import { useTickerData } from './hooks/useTickerData'

const MAX_SELECTED = 3

type InstrumentsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tickers: string[] }

export default function App() {
  const [instruments, setInstruments] = useState<InstrumentsState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [rebase, setRebase] = useState(false)

  const { theme, toggle: toggleTheme } = useTheme()
  const { entries, retry } = useTickerData(selected)

  const loadInstruments = useCallback(() => {
    setInstruments({ status: 'loading' })
    fetchInstruments()
      .then((tickers) => setInstruments({ status: 'ready', tickers }))
      .catch((err: unknown) =>
        setInstruments({
          status: 'error',
          message: err instanceof Error ? err.message : 'Something went wrong',
        }),
      )
  }, [])

  useEffect(() => {
    loadInstruments()
  }, [loadInstruments])

  const allTickers = instruments.status === 'ready' ? instruments.tickers : []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? allTickers.filter((t) => t.toLowerCase().includes(q)) : allTickers
  }, [allTickers, search])

  const toggle = (ticker: string) =>
    setSelected((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : prev.length < MAX_SELECTED
          ? [...prev, ticker]
          : prev,
    )

  return (
    <div className="app">
      <header>
        <h1>Instrument Price Dashboard</h1>
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <input
            type="search"
            placeholder="Search tickers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tickers"
            disabled={instruments.status !== 'ready'}
          />

          {instruments.status === 'loading' && <p className="muted pad">Loading instruments…</p>}

          {instruments.status === 'error' && (
            <div className="error-box">
              <p>{instruments.message}</p>
              <button onClick={loadInstruments}>Retry</button>
            </div>
          )}

          {instruments.status === 'ready' && (
            <>
              <p className="muted count">
                {filtered.length} of {allTickers.length} · {selected.length}/{MAX_SELECTED} selected
              </p>
              <TickerList
                tickers={filtered}
                selected={selected}
                maxSelected={MAX_SELECTED}
                onToggle={toggle}
              />
            </>
          )}
        </aside>

        <main>
          {selected.length === 0 ? (
            <div className="empty muted">
              <p>Select a ticker to see its price chart and stats.</p>
              <p>Select up to {MAX_SELECTED} to compare them on one chart.</p>
            </div>
          ) : (
            <>
              <div className="toolbar">
                <label>
                  <input type="checkbox" checked={rebase} onChange={(e) => setRebase(e.target.checked)} />
                  Rebase to 100 (easier to compare tickers at different price levels)
                </label>
                <button onClick={() => setSelected([])}>Clear selection</button>
              </div>

              <PriceChart tickers={selected} entries={entries} rebase={rebase} />
              <StatsPanel tickers={selected} entries={entries} onRetry={retry} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
