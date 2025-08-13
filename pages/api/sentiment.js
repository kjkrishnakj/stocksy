import axios from "axios";
import yf from "yahoo-finance2";

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "ProsusAI/finbert";

/** Map Hugging Face FinBERT labels to plain sentiment */
function mapHFLabel(label) {
  if (!label) return "neutral";
  label = label.toLowerCase();
  if (["positive", "label_2"].includes(label)) return "positive";
  if (["negative", "label_0"].includes(label)) return "negative";
  return "neutral";
}

/** Improved action decision based on sentiment score */
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

/** Extract company symbol from prompt */
async function extractCompany(prompt) {
  try {
    const searchResult = await yf.search(prompt);
    if (searchResult?.quotes?.length > 0) {
      return searchResult.quotes[0].symbol;
    }
  } catch (e) {
    console.warn("Yahoo lookup failed:", e.message);
  }

  // fallback: last meaningful word
  const words = prompt.split(" ").filter(w => w.length > 1);
  return words[words.length - 1];
}

/** Get current stock data from Yahoo Finance */
async function getStockData(symbol) {
  try {
    const quote = await yf.quote(symbol);
    return {
      currentPrice: quote?.regularMarketPrice || null,
      change: quote?.regularMarketChange || null,
      changePercent: quote?.regularMarketChangePercent
        ? (quote.regularMarketChangePercent * 100).toFixed(2)
        : null,
      trend:
        quote?.regularMarketChange > 0
          ? "up"
          : quote?.regularMarketChange < 0
          ? "down"
          : "neutral",
    };
  } catch (e) {
    console.warn("Failed to fetch stock data:", e.message);
    return { currentPrice: null, change: null, changePercent: null, trend: "neutral" };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const company = await extractCompany(prompt);
  if (!company) {
    return res.status(400).json({ error: "Could not extract company name or symbol" });
  }

  try {
    /** 1. Get recent news */
    const newsRes = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: company,
        language: "en",
        sortBy: "relevance",
        pageSize: 5,
        apiKey: NEWSAPI_KEY,
      },
    });

    const articles = newsRes.data.articles;
    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: `No recent news found for "${company}".` });
    }

    /** 2. Run sentiment analysis in parallel (one request per headline) */
    const hfRequests = articles.map(a =>
      axios.post(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        { inputs: a.title },
        { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
      ).then(res => {
        const resultArr = Array.isArray(res.data) ? res.data[0] : res.data;
        if (Array.isArray(resultArr) && resultArr.length > 0) {
          const top = resultArr.reduce((a, b) => (a.score > b.score ? a : b));
          return {
            sentiment: mapHFLabel(top.label),
            confidence: (top.score * 100).toFixed(2)
          };
        }
        return { sentiment: "neutral", confidence: "0.00" };
      }).catch(() => ({ sentiment: "neutral", confidence: "0.00" }))
    );

    const results = await Promise.all(hfRequests);
    const sentiments = results.map(r => r.sentiment);
    const confidences = results;

    /** 3. Decide action */
    const action = decideAction(sentiments);

    /** 4. Get stock data */
    const stockData = await getStockData(company);

    /** 5. Respond */
    res.status(200).json({
      sentiment: action === "Buy" ? "positive" : action === "Sell" ? "negative" : "neutral",
      action,
      confidenceBreakdown: confidences,
      currentPrice: stockData.currentPrice,
      change: stockData.change,
      changePercent: stockData.changePercent,
      trend: stockData.trend,
      reason: `Based on sentiment analysis of ${articles.length} recent news headlines for "${company}".`,
      news: articles.map(a => ({ title: a.title, url: a.url })),
    });

  } catch (error) {
    console.error("Error in /api/sentiment:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error || error.message || "Error processing request" });
  }
}
