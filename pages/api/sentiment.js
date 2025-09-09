import axios from "axios";

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "ProsusAI/finbert";
const FINNHUB_KEY = process.env.FINNHUB_KEY;

/** Map Hugging Face FinBERT labels to plain sentiment */
function mapHFLabel(label) {
  if (!label) return "neutral";
  label = label.toLowerCase();
  if (["positive", "label_2"].includes(label)) return "positive";
  if (["negative", "label_0"].includes(label)) return "negative";
  return "neutral";
}

/** Decide action based on sentiment score */
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

/** Extract company symbol using Finnhub search */
async function extractSymbol(prompt) {
  const words = prompt.match(/[a-zA-Z]+/g);
  if (!words || words.length === 0) return null;
  const query = words.pop(); // last meaningful word
  try {
    const res = await axios.get("https://finnhub.io/api/v1/search", {
      params: { q: query, token: FINNHUB_KEY }
    });
    if (res.data.result && res.data.result.length > 0) {
      return res.data.result[0].symbol;
    }
  } catch (e) {
    console.warn("Finnhub symbol lookup failed:", e.message);
  }
  return query.toUpperCase(); // fallback
}

/** Get current stock data from Finnhub */
async function getStockData(symbol) {
  try {
    const res = await axios.get("https://finnhub.io/api/v1/quote", {
      params: { symbol, token: FINNHUB_KEY }
    });
    const data = res.data;
    return {
      currentPrice: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
      trend: data.d > 0 ? "up" : data.d < 0 ? "down" : "neutral"
    };
  } catch (e) {
    console.error("Failed to fetch Finnhub stock data:", e.message);
    return { currentPrice: 0, change: 0, changePercent: 0, trend: "neutral" };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const symbol = await extractSymbol(prompt);
  if (!symbol) return res.status(400).json({ error: "Could not extract company symbol" });

  try {
    /** 1. Get recent news */
    const newsRes = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: symbol,
        language: "en",
        sortBy: "relevance",
        pageSize: 5,
        apiKey: NEWSAPI_KEY
      }
    });
    const articles = newsRes.data.articles;
    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: `No recent news found for "${symbol}".` });
    }

    /** 2. Run sentiment analysis in parallel */
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

    /** 3. Decide action */
    const action = decideAction(sentiments);

    /** 4. Get stock data */
    const stockData = await getStockData(symbol);

    /** 5. Respond */
    res.status(200).json({
      sentiment: action === "Buy" ? "positive" : action === "Sell" ? "negative" : "neutral",
      action,
      confidenceBreakdown: results,
      currentPrice: stockData.currentPrice,
      change: stockData.change,
      changePercent: stockData.changePercent,
      trend: stockData.trend,
      high: stockData.high,
      low: stockData.low,
      open: stockData.open,
      prevClose: stockData.prevClose,
      reason: `Based on sentiment analysis of ${articles.length} recent news headlines for "${symbol}".`,
      news: articles.map(a => ({ title: a.title, url: a.url }))
    });
  } catch (error) {
    console.error("Error in /api/sentiment:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error || error.message || "Error processing request" });
  }
}
