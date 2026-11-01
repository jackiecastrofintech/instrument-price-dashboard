using Backend.Options;
using Backend.Services;
using Microsoft.OpenApi;
using System.Reflection;

namespace Backend.Extensions;

public static class ServiceCollectionExtensions
{
    private const string CorsPolicyName = "Frontend";

    public static IServiceCollection AddPriceData(this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<DataOptions>()
            .Bind(config.GetSection(DataOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Loaded once on first resolve (forced at startup in Program.cs) and shared for the app's lifetime.
        services.AddSingleton<IPriceRepository>(sp =>
        {
            var options = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DataOptions>>().Value;
            var path = Path.IsPathRooted(options.CsvPath)
                ? options.CsvPath
                : Path.Combine(AppContext.BaseDirectory, options.CsvPath);

            var repository = CsvPriceLoader.Load(path);
            sp.GetRequiredService<ILogger<InMemoryPriceRepository>>()
                .LogInformation("Loaded {Count} instruments from {Path}", repository.Tickers.Count, path);
            return repository;
        });
        services.AddSingleton<IStatsCalculator, StatsCalculator>();
        return services;
    }

    public static IServiceCollection AddFrontendCors(this IServiceCollection services, IConfiguration config)
    {
        services.AddOptions<CorsOptions>()
            .Bind(config.GetSection(CorsOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        var origins = config.GetSection(CorsOptions.SectionName).Get<CorsOptions>()?.AllowedOrigins ?? [];
        services.AddCors(o => o.AddPolicy(CorsPolicyName, p => p
            .WithOrigins(origins)
            .WithMethods(HttpMethods.Get)
            .AllowAnyHeader()));
        return services;
    }

    public static IServiceCollection AddApiDocumentation(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(o =>
        {
            o.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Instrument Price Dashboard API",
                Version = "v1",
                Description = "Daily closing prices and computed statistics for 200 synthetic instruments.",
            });

            var xml = Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml");
            if (File.Exists(xml)) o.IncludeXmlComments(xml);
        });
        return services;
    }

    public static IApplicationBuilder UseFrontendCors(this IApplicationBuilder app) => app.UseCors(CorsPolicyName);
}
