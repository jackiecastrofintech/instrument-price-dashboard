using System.Globalization;

public record PricePoint(DateOnly Date, double Price);

public record TickerStats(
    string Ticker,
    double TotalReturnPct,
    double DailyVolatilityPct,
    double MaxDrawdownPct);

public class PriceStore
{
    private readonly Dictionary<string, List<PricePoint>> _series;

    public IReadOnlyList<string> Tickers { get; }

    private PriceStore(Dictionary<string, List<PricePoint>> series)
    {
        _series = series;
        Tickers = series.Keys.OrderBy(t => t, StringComparer.Ordinal).ToList();
    }

    public static PriceStore LoadFromCsv(string path)
    {
        var series = new Dictionary<string, List<PricePoint>>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in File.ReadLines(path).Skip(1)) // skip header
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var parts = line.Split(',');
            if (parts.Length < 3) continue;

            var date = DateOnly.ParseExact(parts[0].Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture);
            var ticker = parts[1].Trim();
            var price = double.Parse(parts[2].Trim(), CultureInfo.InvariantCulture);

            if (!series.TryGetValue(ticker, out var list))
            {
                list = new List<PricePoint>();
                series[ticker] = list;
            }
            list.Add(new PricePoint(date, price));
        }

        foreach (var list in series.Values)
            list.Sort((a, b) => a.Date.CompareTo(b.Date));

        return new PriceStore(series);
    }

    public bool TryGetSeries(string ticker, out List<PricePoint> series) =>
        _series.TryGetValue(ticker, out series!);
}

public static class StatsCalculator
{
    public static TickerStats Compute(string ticker, List<PricePoint> series)
    {
        double first = series[0].Price;
        double last = series[^1].Price;
        double totalReturnPct = (last / first - 1) * 100;

        // Simple daily returns: p[i] / p[i-1] - 1
        var returns = new List<double>();
        for (int i = 1; i < series.Count; i++)
            returns.Add(series[i].Price / series[i - 1].Price - 1);

        // Sample standard deviation (n - 1)
        double volatility = 0;
        if (returns.Count > 1)
        {
            double mean = returns.Average();
            double variance = returns.Sum(r => (r - mean) * (r - mean)) / (returns.Count - 1);
            volatility = Math.Sqrt(variance);
        }

        // Max drawdown: largest drop from a running peak
        double peak = series[0].Price;
        double maxDrawdown = 0;
        foreach (var point in series)
        {
            peak = Math.Max(peak, point.Price);
            maxDrawdown = Math.Max(maxDrawdown, (peak - point.Price) / peak);
        }

        return new TickerStats(ticker, totalReturnPct, volatility * 100, maxDrawdown * 100);
    }
}