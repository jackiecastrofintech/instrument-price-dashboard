# Instrument Price Dashboard

A full-stack app for browsing instruments, viewing 30-day price charts, and seeing basic statistics. Backend is C# / .NET (minimal API); frontend is React + TypeScript (Vite) with Recharts.

The exercise brief is in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) ([original PDF](docs/Take_Home_Instrument_Dashboard.pdf)).

## Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) (any current version)
- Node.js (for the frontend)

## Running the backend

```bash
cd backend
dotnet run
```

The API serves on `http://localhost:5080`. The CSV is loaded and validated once at startup (no database); a malformed file stops the app with a descriptive error.

- **Swagger UI:** `http://localhost:5080/swagger` (Development only)
- **Health check:** `http://localhost:5080/health`

Run the tests from the repo root:

```bash
dotnet test
```

## Backend structure

```
backend/
  Controllers/   thin HTTP layer (InstrumentsController, PricesController)
  Services/      IPriceRepository + in-memory impl, CsvPriceLoader, IStatsCalculator
  Models/        PricePoint, TickerStats
  Options/       strongly typed, validated config (Data, Cors)
  Extensions/    DI / CORS / Swagger registration
tests/Backend.Tests/   unit tests (stats, CSV loader) and API integration tests
```

Configuration lives in `appsettings.json` (`Urls`, `Data:CsvPath`, `Cors:AllowedOrigins`) and can be overridden with environment variables, e.g. `Cors__AllowedOrigins__0`.

## Running the frontend

In a second terminal, with the backend running:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend calls the API at `http://localhost:5080`; set `VITE_API_URL` in `frontend/.env` to change it.

Features: search-as-you-type ticker list, price line chart with stats (total return, volatility, max drawdown), loading/error states (including API unreachable and unknown ticker), and multi-select of up to 3 tickers overlaid on one chart. An "Index to 100" option rebases each series to 100 so tickers at different price levels are easier to compare, and a Table view shows the exact values behind the chart. Enter in the search box selects tickers by typing, including comma-separated lists such as `0001, 0002`. Light and dark themes are available (dark by default).

## API

| Method | Route | Returns |
| --- | --- | --- |
| GET | `/api/instruments` | List of all 200 tickers |
| GET | `/api/prices/{ticker}` | Full 30-day price series (404 if unknown) |
| GET | `/api/prices/{ticker}/stats` | Total return %, daily volatility %, max drawdown % (404 if unknown) |

## Stats definitions

- **Total return %** = (last price / first price - 1) x 100
- **Daily volatility** = sample standard deviation (n-1) of simple daily returns (p[i] / p[i-1] - 1), reported as a percent
- **Max drawdown** = largest peak-to-trough decline over the window, reported as a positive percent (13.4 means a 13.4% decline)

### How max drawdown is calculated

One pass over the closing prices in date order, tracking the running peak:

```
peak = first price
for each price:
    peak = max(peak, price)
    drawdown = (peak - price) / peak
max drawdown = largest drawdown seen
```

Example: prices 100, 200, 100, 150, 190 peak at 200 and later fall to 100, a 50% drawdown. The later recovery to 190 does not reduce it. A series that only rises has a drawdown of 0. Only closing prices are used, so intraday moves are not captured.

Ticker lookup is case-insensitive. Errors use RFC 7807 `ProblemDetails` (e.g. `{"title":"Unknown ticker","status":404,"detail":"Unknown ticker 'NOPE'"}`).

## Design notes

- Port 5080 is used because macOS reserves port 5000 for AirPlay Receiver.
- CORS is enabled only for GET requests from the configured origins (default: `localhost:5173` and `localhost:3000`).

## Use of AI assistance

I used Claude to help set up the .NET project on macOS and to draft the backend and React frontend code. I verified the stats output against an independent Python calculation on the same data.
