interface Props {
  tickers: string[]
  selected: string[]
  maxSelected: number
  onToggle: (ticker: string) => void
}

export function TickerList({ tickers, selected, maxSelected, onToggle }: Props) {
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
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => onToggle(ticker)}
                title={disabled ? `You can compare up to ${maxSelected} tickers` : undefined}
              />
              {ticker}
            </label>
          </li>
        )
      })}
    </ul>
  )
}
