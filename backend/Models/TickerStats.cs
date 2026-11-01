namespace Backend.Models;

/// <summary>Computed statistics for one instrument over the full data window.</summary>
/// <param name="Ticker">Canonical ticker symbol.</param>
/// <param name="TotalReturnPct">(last / first - 1) x 100.</param>
/// <param name="DailyVolatilityPct">Sample standard deviation of simple daily returns, in percent.</param>
/// <param name="MaxDrawdownPct">Largest peak-to-trough decline, as a positive percent.</param>
public record TickerStats(
    string Ticker,
    double TotalReturnPct,
    double DailyVolatilityPct,
    double MaxDrawdownPct);
