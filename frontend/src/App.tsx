import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchInstruments } from './api'
import { formatFullDate } from './chartData'
import { PriceChart } from './components/PriceChart'
import { PriceTable } from './components/PriceTable'
import { StatsPanel } from './components/StatsPanel'
import { TickerList } from './components/TickerList'
import { useTheme } from './hooks/useTheme'
import { useTickerData } from './hooks/useTickerData'
import { SERIES_COLORS } from './theme/series'

const MAX_SELECTED = SERIES_COLORS.length

type View = 'chart' | 'table'

interface Selection {
  tickers: string[]
  /** Color slot per ticker. A ticker keeps its slot while selected, so deselecting another never repaints it. */
  slots: Record<string, number>
}

function withSlots(prev: Selection, tickers: string[]): Selection {
  const slots: Record<string, number> = {}
  const used = new Set<number>()
  for (const t of tickers) {
    if (prev.slots[t] !== undefined) {
      slots[t] = prev.slots[t]
      used.add(prev.slots[t])
    }
  }
  for (const t of tickers) {
    if (slots[t] !== undefined) continue
    let i = 0
    while (used.has(i)) i++
    slots[t] = i
    used.add(i)
  }
  return { tickers, slots }
}

type InstrumentsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tickers: string[] }

export default function App() {
  const [instruments, setInstruments] = useState<InstrumentsState>({ status: 'loading' })
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState<Selection>({ tickers: [], slots: {} })
  const [rebase, setRebase] = useState(false)
  const [view, setView] = useState<View>('chart')

  const selected = selection.tickers
  const setSelected = (update: (prev: string[]) => string[]) =>
    setSelection((prev) => withSlots(prev, update(prev.tickers)))
  const colors = useMemo(
    () => Object.fromEntries(selected.map((t) => [t, SERIES_COLORS[selection.slots[t]]])),
    [selected, selection.slots],
  )

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

  // With comma-separated input, the list narrows to the token being typed (after the last comma).
  const filtered = useMemo(() => {
    const q = (search.split(',').pop() ?? '').trim().toLowerCase()
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

  /** Resolve one typed token: exact ticker ("tick0001"), its number ("0001" / "1"), or a unique partial match. */
  const resolveToken = (token: string): string | undefined => {
    const q = token.trim().toLowerCase()
    if (!q) return undefined

    const numeric = /^\d+$/.test(q) ? Number(q) : null
    return (
      allTickers.find((t) => t.toLowerCase() === q) ??
      (numeric === null ? undefined : allTickers.find((t) => Number(t.replace(/^\D+/, '')) === numeric)) ??
      (() => {
        const partial = allTickers.filter((t) => t.toLowerCase().includes(q))
        return partial.length === 1 ? partial[0] : undefined
      })()
    )
  }

  /** Enter in the search box: select every ticker in a comma-separated list, e.g. "tick0002, 3, 0004". */
  const selectFromSearch = () => {
    const tokens = search.split(',').map((t) => t.trim()).filter(Boolean)
    if (tokens.length === 0) return

    const resolved = tokens.map((token) => ({ token, ticker: resolveToken(token) }))
    const matches = [...new Set(resolved.flatMap((r) => (r.ticker ? [r.ticker] : [])))]

    setSelected((prev) => {
      const next = [...prev]
      for (const ticker of matches) {
        if (next.length >= MAX_SELECTED) break
        if (!next.includes(ticker)) next.push(ticker)
      }
      return next
    })

    // Keep anything that didn't match so the user can see and fix it.
    setSearch(resolved.filter((r) => !r.ticker).map((r) => r.token).join(', '))
  }

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const ready = selected.filter((t) => entries[t]?.status === 'ready')
  const first = entries[ready[0]]
  const window =
    first?.status === 'ready' && first.prices.length > 0
      ? `${formatFullDate(first.prices[0].date)} – ${formatFullDate(first.prices[first.prices.length - 1].date)}`
      : null

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Instrument Price Dashboard</h1>
          {instruments.status === 'ready' && (
            <p className="subtitle">{allTickers.length} instruments · daily closing prices</p>
          )}
        </div>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            {theme === 'dark' ? (
              <>
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" strokeLinecap="round" />
              </>
            ) : (
              <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" strokeLinejoin="round" />
            )}
          </svg>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      <div className="layout">
        <aside className="panel sidebar">
          <input
            type="search"
            placeholder="Search or type + Enter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') selectFromSearch()
            }}
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
              <p className="count">
                <span>{filtered.length} of {allTickers.length}</span>
                <span>{selected.length}/{MAX_SELECTED} selected</span>
              </p>
              {selected.length >= MAX_SELECTED && (
                <p className="limit-note">Maximum of {MAX_SELECTED} reached. Deselect one to add another.</p>
              )}
              <TickerList
                tickers={filtered}
                selected={selected}
                colors={colors}
                maxSelected={MAX_SELECTED}
                onToggle={toggle}
              />
            </>
          )}
        </aside>

        <main className="panel content">
          {selected.length === 0 ? (
            <div className="empty">
              <h2>No tickers selected</h2>
              <p>
                Pick a ticker from the list, or type several separated by commas (for example{' '}
                <code>0001, 0002</code>) and press Enter. Select up to {MAX_SELECTED} to compare them.
              </p>
            </div>
          ) : (
            <>
              <div className="content-header">
                <div>
                  <h2>{rebase ? 'Indexed price (start = 100)' : 'Closing price'}</h2>
                  {window && <p className="subtitle">{window}</p>}
                </div>
                {selected.length > 1 && (
                  <ul className="legend" aria-label="Legend">
                    {selected.map((t) => (
                      <li key={t}>
                        <span className="key" style={{ background: colors[t] }} />
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="toolbar">
                <div className="segmented" role="group" aria-label="View">
                  {(['chart', 'table'] as const).map((v) => (
                    <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
                      {v === 'chart' ? 'Chart' : 'Table'}
                    </button>
                  ))}
                </div>
                <label className="check" title="Rebase each series to 100 at the start so different price levels can be compared">
                  <input type="checkbox" checked={rebase} onChange={(e) => setRebase(e.target.checked)} />
                  Index to 100
                </label>
                <button className="ghost" onClick={() => setSelected(() => [])}>Clear selection</button>
              </div>

              {view === 'chart' ? (
                <PriceChart tickers={selected} entries={entries} colors={colors} rebase={rebase} />
              ) : (
                <PriceTable tickers={selected} entries={entries} colors={colors} rebase={rebase} />
              )}
              <StatsPanel tickers={selected} entries={entries} colors={colors} onRetry={retry} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
