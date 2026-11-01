namespace Backend.Models;

/// <summary>A single daily closing price.</summary>
/// <param name="Date">Trading date.</param>
/// <param name="Price">Closing price.</param>
public record PricePoint(DateOnly Date, double Price);
