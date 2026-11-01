using Backend.Models;
using Backend.Services;

namespace Backend.Tests;

public class StatsCalculatorTests
{
    private readonly StatsCalculator _calc = new();

    private static List<PricePoint> Series(params double[] prices) =>
        prices.Select((p, i) => new PricePoint(new DateOnly(2026, 1, 1).AddDays(i), p)).ToList();

    [Fact]
    public void TotalReturn_IsLastOverFirstMinusOne()
    {
        var stats = _calc.Compute("X", Series(100, 110, 120));
        Assert.Equal(20, stats.TotalReturnPct, 6);
    }

    [Fact]
    public void MaxDrawdown_IsLargestPeakToTroughDecline()
    {
        // Peak 200 -> trough 100 = 50%; later recovery must not hide it.
        var stats = _calc.Compute("X", Series(100, 200, 100, 150, 190));
        Assert.Equal(50, stats.MaxDrawdownPct, 6);
    }

    [Fact]
    public void MaxDrawdown_IsZeroForMonotonicallyRisingSeries() =>
        Assert.Equal(0, _calc.Compute("X", Series(1, 2, 3)).MaxDrawdownPct);

    [Fact]
    public void Volatility_IsSampleStdDevOfSimpleReturns()
    {
        // Returns: +10%, -10% -> mean 0, sample variance = (0.01 + 0.01) / 1 = 0.02
        var stats = _calc.Compute("X", Series(100, 110, 99));
        Assert.Equal(Math.Sqrt(0.02) * 100, stats.DailyVolatilityPct, 1);
    }

    [Fact]
    public void Volatility_IsZeroForFlatSeries() =>
        Assert.Equal(0, _calc.Compute("X", Series(5, 5, 5, 5)).DailyVolatilityPct);

    [Fact]
    public void Compute_ThrowsWhenFewerThanTwoPoints() =>
        Assert.Throws<ArgumentException>(() => _calc.Compute("X", Series(1)));
}
