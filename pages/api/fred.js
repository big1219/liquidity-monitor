const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

async function fetchSeries(seriesId, apiKey, limit) {
  var url = FRED_BASE + "?series_id=" + seriesId + "&api_key=" + apiKey + "&file_type=json&sort_order=desc&limit=" + limit;
  var res = await fetch(url);
  if (!res.ok) return [];
  var json = await res.json();
  return (json.observations || []).filter(function(o) { return o.value !== "."; }).map(function(o) { return { date: o.date, value: parseFloat(o.value) }; });
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  var apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "FRED_API_KEY not set" });

  try {
    var series = { WALCL: 60, WTREGEN: 60, WSHOMCB: 60, RRPONTSYD: 60, WRESBAL: 60, SOFR: 60, DTWEXBGS: 60, M2SL: 24, EFFR: 60, DGS10: 60, DGS2: 60, VIXCLS: 60 };
    var results = {};
    await Promise.all(Object.entries(series).map(async function(entry) {
      results[entry[0]] = await fetchSeries(entry[0], apiKey, entry[1]);
    }));

    var walcl = (results.WALCL || []).reverse();
    if (!walcl.length) return res.status(502).json({ error: "No WALCL data" });

    function findClosest(arr, date) {
      if (!arr || !arr.length) return null;
      var sorted = arr.slice().sort(function(a, b) { return a.date.localeCompare(b.date); });
      for (var i = sorted.length - 1; i >= 0; i--) { if (sorted[i].date <= date) return sorted[i].value; }
      return sorted[0] ? sorted[0].value : null;
    }

    var data = walcl.map(function(w) {
      var d = w.date;
      var fa = w.value / 1000;
      var tga = (findClosest(results.WTREGEN, d) || 0) / 1000;
      var mbs = (findClosest(results.WSHOMCB, d) || 0) / 1000;
      var rrp = findClosest(results.RRPONTSYD, d) || 0;
      var rsv = (findClosest(results.WRESBAL, d) || 0) / 1000;
      var sofr = findClosest(results.SOFR, d) || 3.62;
      var dxy = findClosest(results.DTWEXBGS, d) || 99;
      var m2 = (findClosest(results.M2SL, d) || 21500) / 1000;
      var effr = findClosest(results.EFFR, d) || 3.58;
      var y10 = findClosest(results.DGS10, d) || 4.2;
      var y2 = findClosest(results.DGS2, d) || 3.7;
      var vix = findClosest(results.VIXCLS, d) || 20;
      return {
        date: d, fedAssets: Math.round(fa), tga: Math.round(tga), mbs: Math.round(mbs),
        rrp: Math.round(rrp), reserves: Math.round(rsv), netLiquidity: Math.round(fa - tga - rrp),
        sofr: Math.round(sofr * 100) / 100, dxy: Math.round(dxy * 10) / 10,
        globalM2: Math.round(m2 * 4.5 * 10) / 10, stablecoinSupply: 310,
        effr: Math.round(effr * 100) / 100, yield10y: Math.round(y10 * 100) / 100,
        yield2y: Math.round(y2 * 100) / 100, vix: Math.round(vix * 100) / 100,
        weeklyChange: 0, tgaChange: 0, rrpChange: 0, signal: "NEUTRAL", signalScore: 0
      };
    });

    for (var i = 1; i < data.length; i++) {
      data[i].weeklyChange = data[i].netLiquidity - data[i - 1].netLiquidity;
      data[i].tgaChange = data[i].tga - data[i - 1].tga;
      data[i].rrpChange = data[i].rrp - data[i - 1].rrp;
      var sc = 0;
      if (data[i].tgaChange < -20) sc += 2; else if (data[i].tgaChange < -5) sc += 1;
      else if (data[i].tgaChange > 20) sc -= 2; else if (data[i].tgaChange > 5) sc -= 1;
      if (data[i].tga > 800) sc -= 2;
      data[i].signalScore = sc;
      data[i].signal = sc >= 2 ? "INJECTION" : sc >= 1 ? "EASING" : sc <= -2 ? "DRAIN" : sc <= -1 ? "TIGHTENING" : "NEUTRAL";
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ success: true, count: data.length, lastDate: data[data.length - 1].date, data: data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
