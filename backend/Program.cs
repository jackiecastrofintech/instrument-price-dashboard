using Backend.Extensions;
using Backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddPriceData(builder.Configuration);
builder.Services.AddFrontendCors(builder.Configuration);
builder.Services.AddApiDocumentation();
builder.Services.AddHealthChecks();

var app = builder.Build();

// Fail fast: load and validate the CSV at startup rather than on the first request.
_ = app.Services.GetRequiredService<IPriceRepository>();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseFrontendCors();

// Swagger is a development aid; disable it in production.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(o => o.SwaggerEndpoint("/swagger/v1/swagger.json", "Instrument Price Dashboard API v1"));
}

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

/// <summary>Exposed so integration tests can use WebApplicationFactory.</summary>
public partial class Program;
