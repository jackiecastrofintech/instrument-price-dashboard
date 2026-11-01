using Backend.Models;

namespace Backend.Services;

public interface IStatsCalculator
{
    /// <summary>Computes statistics for a date-ordered series of at least two points.</summary>
    TickerStats Compute(string ticker, IReadOnlyList<PricePoint> series);
}
