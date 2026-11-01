using Backend.Models;

namespace Backend.Services;

/// <summary>Read-only access to instrument price history.</summary>
public interface IPriceRepository
{
    /// <summary>All known tickers, sorted ordinally.</summary>
    IReadOnlyList<string> Tickers { get; }

    /// <summary>Looks up a ticker (case-insensitive) and returns its canonical symbol and date-ordered series.</summary>
    bool TryGetSeries(string ticker, out string canonicalTicker, out IReadOnlyList<PricePoint> series);
}
