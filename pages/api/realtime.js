// pages/api/realtime.js
// Real-time market data from Yahoo Finance — no API key needed

var SYMBOLS = {
  "^VIX": { name: "VIX", desc: "변동성 지수" },
  "DX-Y.NYB": { name: "DXY", desc: "달러 인덱스" },
  "BTC-USD": { name: "BTC", desc: "비트코인" },
  "^GSPC": { name: "S&P500", desc: "S&P 500" },
  "GC=F": { name: "Gold", desc: "금" },
  "^TNX": { name: "US10Y", desc: "미국 10년 금리" },
  "^IRX": { name: "US3M", desc: "미국 3개월 금리" },
  "ETH-USD": { name: "ETH", desc: "이더리움" }
};

async function fetchYahoo(symbols) {
  var query = symbols.join(",");
  var url = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" + encodeURIComponent(query) + "&fields=symbol,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime,marketState";
  var res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
  });
  if (!res.ok) throw new Error("Yahoo API " + res.status);
  var json = await res.json();
  return json.quoteResponse && json.quoteResponse.result ? json.quoteResponse.result : [];
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    var symbolList = Object.keys(SYMBOLS);
    var quotes = await fetchYahoo(symbolList);

    var data = quotes.map(function(q) {
      var info = SYMBOLS[q.symbol] || { name: q.symbol, desc: "" };
      return {
        symbol: q.symbol,
        name: info.name,
        desc: info.desc,
        price: q.regularMarketPrice || 0,
        change: Math.round((q.regularMarketChange || 0) * 100) / 100,
        changePercent: Math.round((q.regularMarketChangePercent || 0) * 100) / 100,
        time: q.regularMarketTime ? new Date(q.regularMarketTime * 1000).toISOString() : null,
        marketState: q.marketState || "CLOSED"
      };
    });

    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
    return res.status(200).json({
      success: true,
      count: data.length,
      timestamp: new Date().toISOString(),
      data: data
    });
  } catch (err) {
    // Fallback: try v8 chart API for individual symbols
    try {
      var fallbackData = [];
      var syms = Object.keys(SYMBOLS);
      for (var i = 0; i < syms.length; i++) {
        try {
          var sym = syms[i];
          var chartUrl = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?range=1d&interval=5m";
          var chartRes = await fetch(chartUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
          });
          if (chartRes.ok) {
            var chartJson = await chartRes.json();
            var result = chartJson.chart && chartJson.chart.result && chartJson.chart.result[0];
            if (result && result.meta) {
              var info = SYMBOLS[sym] || { name: sym, desc: "" };
              var prevClose = result.meta.chartPreviousClose || result.meta.previousClose || 0;
              var price = result.meta.regularMarketPrice || 0;
              var ch = Math.round((price - prevClose) * 100) / 100;
              var chP = prevClose > 0 ? Math.round((ch / prevClose) * 10000) / 100 : 0;
              fallbackData.push({
                symbol: sym,
                name: info.name,
                desc: info.desc,
                price: price,
                change: ch,
                changePercent: chP,
                time: result.meta.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : null,
                marketState: result.meta.marketState || "CLOSED"
              });
            }
          }
        } catch (e) { /* skip failed symbol */ }
      }

      if (fallbackData.length > 0) {
        res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
        return res.status(200).json({
          success: true,
          count: fallbackData.length,
          timestamp: new Date().toISOString(),
          source: "chart-fallback",
          data: fallbackData
        });
      }
    } catch (fbErr) { /* fallback also failed */ }

    return res.status(500).json({ error: err.message, hint: "Yahoo Finance API may be rate-limited" });
  }
}
