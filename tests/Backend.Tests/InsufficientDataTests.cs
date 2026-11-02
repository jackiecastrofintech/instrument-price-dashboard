using System.Net;
using System.Net.Http.Json;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Backend.Tests;

/// <summary>A ticker with a single row is valid data: its prices are served, but statistics are not defined.</summary>
public sealed class InsufficientDataTests : IDisposable
{
    private readonly string _csv = Path.GetTempFileName();
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public InsufficientDataTests()
    {
        File.WriteAllText(_csv, string.Join('\n',
            "date,ticker,price",
            "2026-01-01,NORM,10",
            "2026-01-02,NORM,11",
            "2026-01-01,SOLO,100",
            ""));

        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(b => b.UseSetting("Data:CsvPath", _csv));
        _client = _factory.CreateClient();
    }

    public void Dispose()
    {
        _client.Dispose();
        _factory.Dispose();
        File.Delete(_csv);
    }

    [Fact]
    public async Task SingleRowTicker_StillServesItsPrices()
    {
        var response = await _client.GetAsync("/api/prices/SOLO");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var points = await response.Content.ReadFromJsonAsync<PricePoint[]>();
        Assert.Single(points!);
    }

    [Fact]
    public async Task SingleRowTicker_StatsReturn422WithAnExplanation()
    {
        var response = await _client.GetAsync("/api/prices/solo/stats");

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Equal("Insufficient data", problem!.Title);
        Assert.Equal(422, problem.Status);
        Assert.Equal("'SOLO' has 1 price point; at least 2 are needed to compute statistics.", problem.Detail);
    }

    [Fact]
    public async Task TickerWithEnoughRows_StatsReturn200()
    {
        var response = await _client.GetAsync("/api/prices/NORM/stats");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var stats = await response.Content.ReadFromJsonAsync<TickerStats>();
        Assert.Equal(10, stats!.TotalReturnPct, 6);
    }
}
