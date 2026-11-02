/** Resolve one typed token: exact ticker ("tick0001"), its number ("0001" / "1"), or a unique partial match. */
export function resolveToken(token: string, allTickers: string[]): string | undefined {
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

/** With comma-separated input, the list narrows to the token being typed (after the last comma). */
export function filterTickers(search: string, allTickers: string[]): string[] {
  const q = (search.split(',').pop() ?? '').trim().toLowerCase()
  return q ? allTickers.filter((t) => t.toLowerCase().includes(q)) : allTickers
}

export interface SelectionPlan {
  /** Tickers to add to the selection, in typed order. */
  added: string[]
  /** Typed tokens to leave in the search box: unmatched, or matched but over the limit. */
  leftover: string[]
  /** True when at least one matched ticker could not be added because the limit was reached. */
  hitLimit: boolean
}

/** Enter in the search box: work out what a comma-separated list like "tick0002, 3, 0004" should do. */
export function planSelection(
  search: string,
  allTickers: string[],
  selected: string[],
  max: number,
): SelectionPlan {
  const tokens = search.split(',').map((t) => t.trim()).filter(Boolean)

  let free = max - selected.length
  const added: string[] = []
  const leftover: string[] = []
  let hitLimit = false

  for (const token of tokens) {
    const ticker = resolveToken(token, allTickers)
    if (!ticker) leftover.push(token)
    else if (selected.includes(ticker) || added.includes(ticker)) continue
    else if (free > 0) {
      added.push(ticker)
      free--
    } else {
      leftover.push(token)
      hitLimit = true
    }
  }

  return { added, leftover, hitLimit }
}
