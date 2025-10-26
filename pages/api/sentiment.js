import axios from "axios";
import yf from "yahoo-finance2";

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSDATA_KEY = process.env.NEWSDATA_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "ProsusAI/finbert";
const FINNHUB_KEY = process.env.FINNHUB_KEY;

/** Map Hugging Face labels */
function mapHFLabel(label) {
  if (!label) return "neutral";
  label = label.toLowerCase();
  if (["positive", "label_2"].includes(label)) return "positive";
  if (["negative", "label_0"].includes(label)) return "negative";
  return "neutral";
}

/** Decide action */
function decideAction(sentiments) {
  const score = sentiments.reduce((sum, s) => {
    if (s === "positive") return sum + 1;
    if (s === "negative") return sum - 1;
    return sum;
  }, 0);
  if (score > 0) return "Buy";
  if (score < 0) return "Sell";
  return "Hold";
}

/** Extract symbol/company using Yahoo */
async function extractSymbolAndCompany(prompt) {
  try {
    const result = await yf.search(prompt);
    if (result?.quotes?.length > 0) {
      const quote = result.quotes[0];
      return {
        symbol: quote.symbol,
        companyName: quote.longname || quote.shortname || quote.symbol,
      };
    }
  } catch (e) {
    console.warn("Yahoo search failed:", e.message);
  }
  const words = prompt.split(" ").filter(w => w.length > 1);
  const symbol = words.pop();
  return { symbol, companyName: symbol };
}

/** Fetch stock data from Yahoo */
async function getStockData(symbol) {
  try {
    const quote = await yf.quote(symbol);
    return {
      currentPrice: quote?.regularMarketPrice || null,
      change: quote?.regularMarketChange || null,
      changePercent: quote?.regularMarketChangePercent?.toFixed(2) || null,
      trend:
        quote?.regularMarketChange > 0
          ? "up"
          : quote?.regularMarketChange < 0
          ? "down"
          : "neutral",
    };
  } catch (e) {
    console.warn("Stock data fetch failed:", e.message);
    return { currentPrice: null, change: null, changePercent: null, trend: "neutral" };
  }
}

/** Filter relevant articles */
function filterRelevantArticles(articles, symbol, companyName) {
  const searchTerms = [
    symbol.toLowerCase(),
    companyName.toLowerCase(),
    ...companyName.toLowerCase().split(" "),
  ];
  return articles.filter(article => {
    const text = `${article.title} ${article.description || ""}`.toLowerCase();
    return searchTerms.some(term => term.length > 2 && text.includes(term));
  });
}

/** Fetch news from multiple sources */
async function fetchCompanyNews(symbol, companyName) {
  let articles = [];

  // 1. Try NewsData.io
  if (NEWSDATA_KEY) {
    try {
      const res = await axios.get("https://newsdata.io/api/1/news", {
        params: {
          apikey: NEWSDATA_KEY,
          country: "in",
          category: "business",
          language: "en",
          q: companyName,
          size: 10,
        },
        timeout: 7000,
      });
      if (res?.data?.results?.length > 0) {
        const allArticles = res.data.results.map(n => ({
          title: n.title || "No title",
          description: n.description || "",
          url: n.link || "#",
          source: n.source_id || "NewsData.io",
          publishedAt: n.pubDate || null,
        }));
        articles = filterRelevantArticles(allArticles, symbol, companyName);
        console.log(`NewsData.io: Found ${articles.length} relevant articles`);
      }
    } catch (err) {
      console.warn("NewsData.io fetch error:", err.response?.data?.message || err.message);
    }
  }

  // 2. Fallback: NewsAPI
  if (articles.length < 3 && NEWSAPI_KEY) {
    try {
      const res = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: symbol,
          language: "en",
          sortBy: "relevance",
          pageSize: 5,
          apiKey: NEWSAPI_KEY,
        },
        timeout: 5000,
      });
      if (res?.data?.articles?.length > 0) {
        articles = [...articles, ...res.data.articles];
      }
    } catch (err) {
      console.warn("NewsAPI fetch error:", err.response?.data?.message || err.message);
    }
  }

  return articles.slice(0, 6);
}

/** Main API handler */
export default async function handler(req, res) {
  if (!req || req.method !== "POST") return res.status(400).json({ error: "Invalid request" });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const { symbol, companyName } = await extractSymbolAndCompany(prompt);
  if (!symbol) return res.status(400).json({ error: "Could not extract company symbol" });

  console.log(`Analyzing: ${symbol} (${companyName})`);

  const articles = await fetchCompanyNews(symbol, companyName);
  if (!articles || articles.length === 0)
    return res.status(404).json({
      error: `No recent news found for "${companyName}" (${symbol}).`,
      suggestion: "Try a more popular stock or check back later.",
    });

  // Sentiment analysis
  const hfRequests = articles.map(a =>
    axios
      .post(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        { inputs: a.title },
        { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
      )
      .then(resp => {
        const resultArr = Array.isArray(resp.data) ? resp.data[0] : resp.data;
        if (Array.isArray(resultArr) && resultArr.length > 0) {
          const top = resultArr.reduce((a, b) => (a.score > b.score ? a : b));
          return { sentiment: mapHFLabel(top.label), confidence: (top.score * 100).toFixed(2) };
        }
        return { sentiment: "neutral", confidence: "0.00" };
      })
      .catch(() => ({ sentiment: "neutral", confidence: "0.00" }))
  );

  const results = await Promise.all(hfRequests);
  const sentiments = results.map(r => r.sentiment);
  const action = decideAction(sentiments);
  const stockData = await getStockData(symbol);

  res.status(200).json({
    sentiment: action === "Buy" ? "positive" : action === "Sell" ? "negative" : "neutral",
    action,
    confidenceBreakdown: results,
    currentPrice: stockData.currentPrice,
    change: stockData.change,
    changePercent: stockData.changePercent,
    trend: stockData.trend,
    reason: `Based on sentiment analysis of ${articles.length} recent news headlines for "${companyName}" (${symbol}).`,
    news: articles,
    companyName,
  });
}
