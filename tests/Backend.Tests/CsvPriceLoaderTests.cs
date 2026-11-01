using Backend.Services;

namespace Backend.Tests;

public class CsvPriceLoaderTests : IDisposable
{
    private readonly string _path = Path.GetTempFileName();

    public void Dispose() => File.Delete(_path);

    private InMemoryPriceRepository Load(string body)
    {
        File.WriteAllText(_path, "date,ticker,price\n" + body);
        return CsvPriceLoader.Load(_path);
    }

    [Fact]
    public void Load_GroupsByTickerAndSortsByDate()
    {
        var repo = Load("2026-01-02,B,2\n2026-01-02,A,20\n2026-01-01,A,10\n");

        Assert.Equal(["A", "B"], repo.Tickers);
        Assert.True(repo.TryGetSeries("a", out var canonical, out var series));
        Assert.Equal("A", canonical);
        Assert.Equal([10, 20], series.Select(p => p.Price));
    }

    [Fact]
    public void TryGetSeries_ReturnsFalseForUnknownTicker()
    {
        var repo = Load("2026-01-01,A,1\n");
        Assert.False(repo.TryGetSeries("ZZZ", out _, out _));
    }

    [Theory]
    [InlineData("not-a-date,A,1")]
    [InlineData("2026-01-01,A,abc")]
    [InlineData("2026-01-01,A,-5")]
    [InlineData("2026-01-01,,5")]
    [InlineData("2026-01-01,A")]
    public void Load_ThrowsOnMalformedRows(string row) =>
        Assert.Throws<FormatException>(() => Load(row + "\n"));

    [Fact]
    public void Load_ThrowsWhenFileMissing() =>
        Assert.Throws<FileNotFoundException>(() => CsvPriceLoader.Load("/no/such/file.csv"));
}
