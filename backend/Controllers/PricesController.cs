using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/prices")]
[Produces("application/json")]
public class PricesController(IPriceRepository prices, IStatsCalculator stats) : ControllerBase
{
    /// <summary>Gets the full daily closing-price series for a ticker.</summary>
    /// <param name="ticker">Ticker symbol (case-insensitive), e.g. TICK0001.</param>
    /// <response code="200">Price points ordered by date.</response>
    /// <response code="404">The ticker is unknown.</response>
    [HttpGet("{ticker}")]
    [ProducesResponseType<IReadOnlyList<PricePoint>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public ActionResult<IReadOnlyList<PricePoint>> GetPrices(string ticker) =>
        prices.TryGetSeries(ticker, out _, out var series)
            ? Ok(series)
            : UnknownTicker(ticker);

    /// <summary>Gets computed statistics for a ticker: total return, daily volatility, and max drawdown.</summary>
    /// <param name="ticker">Ticker symbol (case-insensitive), e.g. TICK0001.</param>
    /// <response code="200">Statistics over the full data window.</response>
    /// <response code="404">The ticker is unknown.</response>
    /// <response code="422">The ticker exists but has too few price points to compute statistics.</response>
    [HttpGet("{ticker}/stats")]
    [ProducesResponseType<TickerStats>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status422UnprocessableEntity)]
    public ActionResult<TickerStats> GetStats(string ticker)
    {
        if (!prices.TryGetSeries(ticker, out var canonical, out var series))
            return UnknownTicker(ticker);

        if (series.Count < StatsCalculator.MinimumPoints)
            return UnprocessableEntity(new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Insufficient data",
                Detail = $"'{canonical}' has {series.Count} price point{(series.Count == 1 ? "" : "s")}; " +
                         $"at least {StatsCalculator.MinimumPoints} are needed to compute statistics.",
            });

        return Ok(stats.Compute(canonical, series));
    }

    private NotFoundObjectResult UnknownTicker(string ticker) =>
        NotFound(new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Unknown ticker",
            Detail = $"Unknown ticker '{ticker}'",
        });
}
