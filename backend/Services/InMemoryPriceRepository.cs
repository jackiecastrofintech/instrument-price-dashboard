using Backend.Models;

namespace Backend.Services;

/// <summary>Immutable in-memory <see cref="IPriceRepository"/>. Safe to share across requests.</summary>
public sealed class InMemoryPriceRepository : IPriceRepository
{
    private readonly Dictionary<string, IReadOnlyList<PricePoint>> _series;

    public InMemoryPriceRepository(IReadOnlyDictionary<string, List<PricePoint>> series)
    {
        _series = new Dictionary<string, IReadOnlyList<PricePoint>>(StringComparer.OrdinalIgnoreCase);
        foreach (var (ticker, points) in series)
            _series[ticker] = points.OrderBy(p => p.Date).ToList().AsReadOnly();

        Tickers = _series.Keys.OrderBy(t => t, StringComparer.Ordinal).ToList().AsReadOnly();
    }

    public IReadOnlyList<string> Tickers { get; }

    public bool TryGetSeries(string ticker, out string canonicalTicker, out IReadOnlyList<PricePoint> series)
    {
        canonicalTicker = string.Empty;
        if (!_series.TryGetValue(ticker, out series!))
            return false;

        // Dictionary is case-insensitive, so recover the stored spelling.
        canonicalTicker = Tickers.First(t => string.Equals(t, ticker, StringComparison.OrdinalIgnoreCase));
        return true;
    }
}
