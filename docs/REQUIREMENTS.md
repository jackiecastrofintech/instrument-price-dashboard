# Take-Home Exercise: Instrument Price Dashboard

Source: [Take_Home_Instrument_Dashboard.pdf](Take_Home_Instrument_Dashboard.pdf)

Build a small full-stack app (React + C#/.NET) that lets a user browse instruments, view a price chart, and see basic computed statistics. Input is a CSV of synthetic daily closing prices for 200 instruments over a 30-day window (columns: `date`, `ticker`, `price`).

## Backend (C#)

Load the CSV in memory (no database) and expose:

| Method | Route | Returns |
| --- | --- | --- |
| GET | `/api/instruments` | List of all 200 tickers |
| GET | `/api/prices/{ticker}` | Full 30-day time series for one ticker (404 if unknown) |
| GET | `/api/prices/{ticker}/stats` | Total return %, daily volatility (stdev of returns), max drawdown |

Stats definitions (note any different interpretation in the README):

- Total return % = (last price / first price - 1) x 100
- Daily volatility = standard deviation of daily returns over the window
- Max drawdown = largest peak-to-trough decline over the window

## Frontend (React)

- List/search view of all 200 tickers (search-as-you-type; no fuzzy matching needed)
- Selecting a ticker shows a price line chart over the 30-day window (any charting library)
- Display the computed stats (return %, volatility, max drawdown) alongside the chart
- Handle loading and error states (API unreachable, unknown ticker)
- Multi-select 2-3 tickers and overlay them on a single chart for comparison

## Constraints and ground rules

- Must run locally
- Any charting library and HTTP client is fine
- AI coding assistants are fine; note in the README where they helped

## Submission

- A git repo (zip or link) with backend and frontend
