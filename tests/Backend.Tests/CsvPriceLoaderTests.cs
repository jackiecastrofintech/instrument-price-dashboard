using System.Text;
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

    private InMemoryPriceRepository LoadRaw(string content, Encoding? encoding = null)
    {
        File.WriteAllText(_path, content, encoding ?? new UTF8Encoding(false));
        return CsvPriceLoader.Load(_path);
    }

    [Theory]
    [InlineData("day,ticker,price")]
    [InlineData("date,symbol,price")]
    [InlineData("date,ticker")]
    [InlineData("date,ticker,price,volume")]
    [InlineData("2026-01-01,A,1")] // a data row where the header should be
    public void Load_ThrowsOnWrongHeader(string header) =>
        Assert.Throws<FormatException>(() => LoadRaw(header + "\n2026-01-01,A,1\n"));

    [Theory]
    [InlineData("")]
    [InlineData("\n")]
    public void Load_ThrowsOnEmptyFile(string content) =>
        Assert.Throws<FormatException>(() => LoadRaw(content));

    [Theory]
    [InlineData("Date, Ticker, Price")]
    [InlineData("DATE,TICKER,PRICE")]
    [InlineData("  date , ticker , price  ")]
    public void Load_AcceptsHeaderWithDifferentCaseOrSpacing(string header)
    {
        var repo = LoadRaw(header + "\n2026-01-01,A,1\n");
        Assert.Equal(["A"], repo.Tickers);
    }

    [Fact]
    public void Load_AcceptsUtf8Bom()
    {
        var repo = LoadRaw("date,ticker,price\n2026-01-01,A,1\n", new UTF8Encoding(true));
        Assert.Equal(["A"], repo.Tickers);
    }

    [Fact]
    public void Load_AcceptsWindowsLineEndings()
    {
        var repo = LoadRaw("date,ticker,price\r\n2026-01-01,A,1\r\n2026-01-02,A,2\r\n");
        Assert.True(repo.TryGetSeries("A", out _, out var series));
        Assert.Equal([1, 2], series.Select(p => p.Price));
    }

    [Fact]
    public void Load_ThrowsOnDuplicateTickerAndDate()
    {
        var ex = Assert.Throws<FormatException>(() => Load("2026-01-01,A,1\n2026-01-02,A,2\n2026-01-01,A,3\n"));
        Assert.Contains("'A'", ex.Message);
        Assert.Contains("2026-01-01", ex.Message);
        Assert.Contains("data row 3", ex.Message);
    }

    [Fact]
    public void Load_ThrowsOnDuplicateThatDiffersOnlyInTickerCase()
    {
        var ex = Assert.Throws<FormatException>(() => Load("2026-01-01,A,1\n2026-01-01,a,2\n"));
        Assert.Contains("'a'", ex.Message);
        Assert.Contains("2026-01-01", ex.Message);
        Assert.Contains("data row 2", ex.Message);
    }

    [Fact]
    public void Load_AllowsSameTickerOnDifferentDatesAndSameDateForDifferentTickers()
    {
        var repo = Load("2026-01-01,A,1\n2026-01-02,A,2\n2026-01-01,B,3\n");
        Assert.Equal(["A", "B"], repo.Tickers);
    }

    [Fact]
    public void Load_AcceptsATickerWithASingleRow()
    {
        var repo = Load("2026-01-01,SOLO,5\n2026-01-01,A,1\n2026-01-02,A,2\n");
        Assert.True(repo.TryGetSeries("SOLO", out _, out var series));
        Assert.Single(series);
    }

    [Fact]
    public void Load_ThrowsWhenFileMissing() =>
        Assert.Throws<FileNotFoundException>(() => CsvPriceLoader.Load("/no/such/file.csv"));
}
