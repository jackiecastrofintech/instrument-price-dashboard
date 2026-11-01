# Instrument Price Dashboard

A full-stack app for browsing instruments, viewing 30-day price charts, and seeing basic statistics. Backend is C# / .NET (minimal API); frontend is React (coming next).

## Prerequisites

- [.NET SDK](https://dotnet.microsoft.com/download) (any current version)
- Node.js (for the frontend)

## Running the backend

```bash
cd backend
dotnet run
```

The API serves on `http://localhost:5080`. The CSV is loaded into memory once at startup (no database).

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

Ticker lookup is case-insensitive.

## Design notes

- Port 5080 is used because macOS reserves port 5000 for AirPlay Receiver.
- CORS is enabled only for local React dev server origins (`localhost:5173` and `localhost:3000`).

## Use of AI assistance

I used Claude to help set up the .NET project on macOS and to draft the backend code. I verified the stats output against an independent Python calculation on the same data.
