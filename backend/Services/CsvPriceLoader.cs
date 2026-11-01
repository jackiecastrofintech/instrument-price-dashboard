using System.Globalization;
using Backend.Models;

namespace Backend.Services;

/// <summary>Parses the market data CSV (<c>date,ticker,price</c>) into an <see cref="IPriceRepository"/>.</summary>
public static class CsvPriceLoader
{
    private const string DateFormat = "yyyy-MM-dd";

    public static InMemoryPriceRepository Load(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException($"Market data file not found: {path}", path);

        var series = new Dictionary<string, List<PricePoint>>(StringComparer.OrdinalIgnoreCase);
        var lineNumber = 0;

        foreach (var line in File.ReadLines(path).Skip(1)) // skip header
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line)) continue;

            var parts = line.Split(',');
            if (parts.Length != 3)
                throw new FormatException($"{path}: data row {lineNumber} has {parts.Length} columns, expected 3.");

            if (!DateOnly.TryParseExact(parts[0].Trim(), DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                throw new FormatException($"{path}: data row {lineNumber} has invalid date '{parts[0]}' (expected {DateFormat}).");

            var ticker = parts[1].Trim();
            if (ticker.Length == 0)
                throw new FormatException($"{path}: data row {lineNumber} has an empty ticker.");

            if (!double.TryParse(parts[2].Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var price) || price <= 0)
                throw new FormatException($"{path}: data row {lineNumber} has invalid price '{parts[2]}'.");

            if (!series.TryGetValue(ticker, out var list))
                series[ticker] = list = [];
            list.Add(new PricePoint(date, price));
        }

        return new InMemoryPriceRepository(series);
    }
}
