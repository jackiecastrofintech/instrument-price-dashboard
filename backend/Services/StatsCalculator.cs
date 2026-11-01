using Backend.Models;

namespace Backend.Services;

public sealed class StatsCalculator : IStatsCalculator
{
    public TickerStats Compute(string ticker, IReadOnlyList<PricePoint> series)
    {
        ArgumentNullException.ThrowIfNull(series);
        if (series.Count < 2)
            throw new ArgumentException("At least two price points are required to compute statistics.", nameof(series));

        var totalReturnPct = (series[^1].Price / series[0].Price - 1) * 100;

        return new TickerStats(ticker, totalReturnPct, DailyVolatility(series) * 100, MaxDrawdown(series) * 100);
    }

    /// <summary>Sample standard deviation (n - 1) of simple daily returns p[i] / p[i-1] - 1.</summary>
    private static double DailyVolatility(IReadOnlyList<PricePoint> series)
    {
        var returns = new double[series.Count - 1];
        for (var i = 1; i < series.Count; i++)
            returns[i - 1] = series[i].Price / series[i - 1].Price - 1;

        if (returns.Length < 2) return 0;

        var mean = returns.Average();
        var variance = returns.Sum(r => (r - mean) * (r - mean)) / (returns.Length - 1);
        return Math.Sqrt(variance);
    }

    /// <summary>Largest fractional drop from a running peak.</summary>
    private static double MaxDrawdown(IReadOnlyList<PricePoint> series)
    {
        var peak = series[0].Price;
        var maxDrawdown = 0.0;
        foreach (var point in series)
        {
            peak = Math.Max(peak, point.Price);
            maxDrawdown = Math.Max(maxDrawdown, (peak - point.Price) / peak);
        }
        return maxDrawdown;
    }
}
