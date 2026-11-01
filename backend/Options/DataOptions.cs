using System.ComponentModel.DataAnnotations;

namespace Backend.Options;

/// <summary>Where the market data lives. Bound from the "Data" configuration section.</summary>
public sealed class DataOptions
{
    public const string SectionName = "Data";

    /// <summary>CSV path, absolute or relative to the application base directory.</summary>
    [Required]
    public string CsvPath { get; init; } = Path.Combine("Data", "market_data.csv");
}
