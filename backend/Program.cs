var builder = WebApplication.CreateBuilder(args);

// Port 5000 is taken by AirPlay Receiver on macOS, so use 5080.
builder.WebHost.UseUrls("http://localhost:5080");

// Allow the React dev server (Vite = 5173, CRA = 3000) to call this API.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173", "http://localhost:3000")
        .AllowAnyHeader()
        .AllowAnyMethod()));

// Load the CSV once at startup and keep it in memory.
builder.Services.AddSingleton(_ =>
    PriceStore.LoadFromCsv(Path.Combine(AppContext.BaseDirectory, "Data", "market_data.csv")));

var app = builder.Build();
app.UseCors();

app.MapGet("/api/instruments", (PriceStore store) => store.Tickers);

app.MapGet("/api/prices/{ticker}", (string ticker, PriceStore store) =>
    store.TryGetSeries(ticker, out var series)
        ? Results.Ok(series)
        : Results.NotFound(new { error = $"Unknown ticker '{ticker}'" }));

app.MapGet("/api/prices/{ticker}/stats", (string ticker, PriceStore store) =>
    store.TryGetSeries(ticker, out var series)
        ? Results.Ok(StatsCalculator.Compute(ticker.ToUpperInvariant(), series))
        : Results.NotFound(new { error = $"Unknown ticker '{ticker}'" }));

app.Run();
