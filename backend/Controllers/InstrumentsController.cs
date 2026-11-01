using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/instruments")]
[Produces("application/json")]
public class InstrumentsController(IPriceRepository prices) : ControllerBase
{
    /// <summary>Lists every available ticker.</summary>
    /// <response code="200">Tickers sorted alphabetically.</response>
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<string>>(StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<string>> GetInstruments() => Ok(prices.Tickers);
}
