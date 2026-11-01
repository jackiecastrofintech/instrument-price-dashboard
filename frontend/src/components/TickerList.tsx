interface Props {
  tickers: string[]
  selected: string[]
  colors: Record<string, string>
  maxSelected: number
  onToggle: (ticker: string) => void
}

export function TickerList({ tickers, selected, colors, maxSelected, onToggle }: Props) {
  const limitReached = selected.length >= maxSelected

  if (tickers.length === 0) {
    return <p className="muted pad">No tickers match your search.</p>
  }

  return (
    <ul className="ticker-list">
      {tickers.map((ticker) => {
        const isSelected = selected.includes(ticker)
        const disabled = !isSelected && limitReached
        return (
          <li key={ticker}>
            <label className={`ticker-row${isSelected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}>
              <input
                className="sr-only"
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => onToggle(ticker)}
                title={disabled ? `You can compare up to ${maxSelected} tickers` : undefined}
              />
              <span className="marker" style={isSelected ? { background: colors[ticker] } : undefined} aria-hidden />
              {ticker}
            </label>
          </li>
        )
      })}
    </ul>
  )
}
