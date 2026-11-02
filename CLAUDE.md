# Instrument Price Dashboard

Take-home exercise. Full requirements: @docs/REQUIREMENTS.md (original PDF in `docs/`).

## Layout
- `backend/` - C# / .NET controller-based API (Controllers/Services/Models/Options), CSV loaded in memory (no DB), port 5080, Swagger at /swagger
- `tests/Backend.Tests/` - xunit unit + integration tests (`dotnet test` from repo root)
- `frontend/` - React + TypeScript (Vite)

## Testing
- Backend: `dotnet test` from the repo root. Frontend: `npm test` in `frontend/` (Vitest + React Testing Library).
- Keep pure logic (ticker matching, selection, chart data) in plain modules under `frontend/src/` so it stays unit-testable.

## Ground rules
- Must run locally
- Keep the README up to date, including where AI assistants helped and any stats interpretations
