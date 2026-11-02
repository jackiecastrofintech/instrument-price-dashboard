export interface Selection {
  tickers: string[]
  /** Color slot per ticker. A ticker keeps its slot while selected, so deselecting another never repaints it. */
  slots: Record<string, number>
}

/** Apply a new ticker list, keeping existing slots and giving new tickers the lowest free one. */
export function withSlots(prev: Selection, tickers: string[]): Selection {
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
