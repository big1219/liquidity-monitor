// pages/api/news.js
// Real-time financial news from free RSS feeds — no API key needed

var RSS_FEEDS = [
  { name: "CNBC Markets", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20409666", cat: "MARKETS" },
  { name: "CNBC Economy", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=20910258", cat: "ECONOMY" },
  { name: "CNBC Finance", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", cat: "FINANCE" },
  { name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/", cat: "MARKETS" },
  { name: "Investing.com", url: "https://www.investing.com/rss/news.rss", cat: "MARKETS" },
  { name: "Reuters Business", url: "https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best", cat: "BUSINESS" }
];

function parseRSS(xml, source, cat) {
  var items = [];
  var itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  var match;
  var count = 0;
  while ((match = itemRegex.exec(xml)) !== null && count < 5) {
    var item = match[1];
    var title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/) || [])[1] || "";
    var link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || "";
    var pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || "";
    var desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) || item.match(/<description>(.*?)<\/description>/) || [])[1] || "";
    // Strip HTML tags from description
    desc = desc.replace(/<[^>]*>/g, "").trim();
    if (desc.length > 200) desc = desc.substring(0, 200) + "...";
    // Clean title
    title = title.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

    if (title) {
      items.push({
        title: title,
        link: link.trim(),
        pubDate: pubDate,
        desc: desc,
        source: source,
        cat: cat,
        timestamp: pubDate ? new Date(pubDate).getTime() : 0
      });
      count++;
    }
  }
  return items;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    var allNews = [];
    var fetches = RSS_FEEDS.map(function(feed) {
      return fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/rss+xml, application/xml, text/xml, */*"
        }
      }).then(function(r) {
        if (!r.ok) return [];
        return r.text().then(function(xml) {
          return parseRSS(xml, feed.name, feed.cat);
        });
      }).catch(function() { return []; });
    });

    var results = await Promise.all(fetches);
    results.forEach(function(items) {
      allNews = allNews.concat(items);
    });

    // Sort by timestamp descending
    allNews.sort(function(a, b) { return b.timestamp - a.timestamp; });

    // Remove duplicates by title similarity
    var seen = {};
    var unique = [];
    allNews.forEach(function(n) {
      var key = n.title.substring(0, 40).toLowerCase();
      if (!seen[key]) {
        seen[key] = true;
        unique.push(n);
      }
    });

    // Take top 20
    unique = unique.slice(0, 20);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      success: true,
      count: unique.length,
      timestamp: new Date().toISOString(),
      data: unique
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
