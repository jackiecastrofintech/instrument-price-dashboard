using System.Globalization;
using Backend.Models;

namespace Backend.Services;

/// <summary>Parses the market data CSV (<c>date,ticker,price</c>) into an <see cref="IPriceRepository"/>.</summary>
public static class CsvPriceLoader
{
    private const string DateFormat = "yyyy-MM-dd";
    private static readonly string[] ExpectedHeader = ["date", "ticker", "price"];

    public static InMemoryPriceRepository Load(string path)
    {
        if (!File.Exists(path))
            throw new FileNotFoundException($"Market data file not found: {path}", path);

        var series = new Dictionary<string, List<PricePoint>>(StringComparer.OrdinalIgnoreCase);
        // "TICKER|date" -> data row where it first appeared. Case-insensitive on the ticker part.
        var seen = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var lineNumber = 0;

        using var lines = File.ReadLines(path).GetEnumerator();
        if (!lines.MoveNext())
            throw new FormatException($"{path}: file is empty; expected a header row 'date,ticker,price'.");
        ValidateHeader(path, lines.Current);

        while (lines.MoveNext())
        {
            var line = lines.Current;
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

            var key = $"{ticker}|{date.ToString(DateFormat, CultureInfo.InvariantCulture)}";
            if (!seen.TryAdd(key, lineNumber))
                throw new FormatException(
                    $"{path}: data row {lineNumber} duplicates ticker '{ticker}' on {date.ToString(DateFormat, CultureInfo.InvariantCulture)} " +
                    $"(first seen at data row {seen[key]}).");

            if (!series.TryGetValue(ticker, out var list))
                series[ticker] = list = [];
            list.Add(new PricePoint(date, price));
        }

        return new InMemoryPriceRepository(series);
    }

    /// <summary>The header must be date,ticker,price: columns trimmed, case-insensitive, optional UTF-8 BOM.</summary>
    private static void ValidateHeader(string path, string header)
    {
        var columns = header.TrimStart('﻿').Split(',').Select(c => c.Trim()).ToArray();
        var matches = columns.Length == ExpectedHeader.Length
            && columns.Zip(ExpectedHeader).All(p => string.Equals(p.First, p.Second, StringComparison.OrdinalIgnoreCase));

        if (!matches)
            throw new FormatException($"{path}: invalid header '{header.TrimStart('﻿')}'; expected 'date,ticker,price'.");
    }
}
