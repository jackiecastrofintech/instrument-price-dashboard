using System.ComponentModel.DataAnnotations;

namespace Backend.Options;

/// <summary>Browser origins allowed to call the API. Bound from the "Cors" configuration section.</summary>
public sealed class CorsOptions
{
    public const string SectionName = "Cors";

    [Required, MinLength(1)]
    public string[] AllowedOrigins { get; init; } = [];
}
