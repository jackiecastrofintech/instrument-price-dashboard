using System.Net;
using System.Net.Http.Json;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Backend.Tests;

public class ApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task Instruments_Returns200Tickers()
    {
        var tickers = await _client.GetFromJsonAsync<string[]>("/api/instruments");
        Assert.Equal(200, tickers!.Length);
    }

    [Fact]
    public async Task Prices_ReturnsSeriesAndIsCaseInsensitive()
    {
        var series = await _client.GetFromJsonAsync<PricePoint[]>("/api/prices/tick0001");
        Assert.NotEmpty(series!);
        Assert.Equal(series!.OrderBy(p => p.Date), series);
    }

    [Fact]
    public async Task Stats_UsesCanonicalTicker()
    {
        var stats = await _client.GetFromJsonAsync<TickerStats>("/api/prices/tick0001/stats");
        Assert.Equal("TICK0001", stats!.Ticker);
    }

    [Theory]
    [InlineData("/api/prices/NOPE")]
    [InlineData("/api/prices/NOPE/stats")]
    public async Task UnknownTicker_Returns404ProblemDetails(string url)
    {
        var response = await _client.GetAsync(url);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Contains("NOPE", problem!.Detail);
    }

    [Fact]
    public async Task Health_ReturnsOk() =>
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/health")).StatusCode);

    // Expected values were calculated from backend/Data/market_data.csv outside .NET (an independent
    // calculation, not this code): total return = last/first - 1; volatility = sample standard deviation
    // (n - 1) of simple daily returns, in percent; max drawdown = largest fall from a running peak.
    [Fact]
    public async Task Stats_Tick0001_MatchesIndependentlyCalculatedValues()
    {
        var stats = await _client.GetFromJsonAsync<TickerStats>("/api/prices/TICK0001/stats");

        Assert.Equal("TICK0001", stats!.Ticker);
        Assert.Equal(-9.167805, stats.TotalReturnPct, 4);
        Assert.Equal(1.523165, stats.DailyVolatilityPct, 4);
        Assert.Equal(13.384939, stats.MaxDrawdownPct, 4);
    }
}
