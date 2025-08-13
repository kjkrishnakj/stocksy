import axios from "axios";
import yf from "yahoo-finance2";

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "ProsusAI/finbert";

function decideAction(sentiments) {
  const counts = { positive: 0, negative: 0, neutral: 0 };
  sentiments.forEach((s) => counts[s] = (counts[s] || 0) + 1);
  if (counts.positive > counts.negative && counts.positive > counts.neutral) return "Buy";
  if (counts.negative > counts.positive && counts.negative > counts.neutral) return "Sell";
  return "Hold";
}

async function extractCompany(prompt) {
  const regex = /\b(?:buy|sell|hold|should i buy|should i sell|should i hold)\s+([a-zA-Z.\s]+)/i;
  const match = prompt.match(regex);
  let name = match && match[1] ? match[1].trim() : prompt.split(" ").pop();
  try {
    const searchResult = await yf.search(name);
    if (searchResult?.quotes?.length > 0) return searchResult.quotes[0].symbol;
  } catch (e) { console.warn("Yahoo lookup failed:", e.message); }
  return name;
}

async function getStockData(symbol) {
  try {
    const quote = await yf.quote(symbol);
    return {
      currentPrice: quote?.regularMarketPrice || null,
      change: quote?.regularMarketChange || null,
      changePercent: quote?.regularMarketChangePercent ? (quote.regularMarketChangePercent * 100).toFixed(2) : null,
      trend: quote?.regularMarketChange > 0 ? "up" : quote?.regularMarketChange < 0 ? "down" : "neutral",
    };
  } catch (e) {
    console.warn("Failed to fetch stock data:", e.message);
    return { currentPrice: null, change: null, changePercent: null, trend: "neutral" };
  }
}

function mapHFLabel(label) {
  if (!label) return "neutral";
  label = label.toLowerCase();
  if (["positive", "label_2"].includes(label)) return "positive";
  if (["negative", "label_0"].includes(label)) return "negative";
  return "neutral";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const company = await extractCompany(prompt);
  if (!company) return res.status(400).json({ error: "Could not extract company name or symbol" });

  try {
    const newsRes = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: company, language: "en", sortBy: "relevance", pageSize: 5, apiKey: NEWSAPI_KEY },
    });

    const articles = newsRes.data.articles;
    if (!articles || articles.length === 0) return res.status(404).json({ error: `No recent news found for "${company}".` });

    const sentiments = await Promise.all(
      articles.map(async (article) => {
        try {
          const hfRes = await axios.post(
            `https://api-inference.huggingface.co/models/${HF_MODEL}`,
            { inputs: article.title },
            { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
          );
          const result = Array.isArray(hfRes.data) ? hfRes.data[0] : hfRes.data;
          return mapHFLabel(result?.label);
        } catch (e) {
          return "neutral";
        }
      })
    );

    const action = decideAction(sentiments);
    const stockData = await getStockData(company);

    res.status(200).json({
      sentiment: action === "Buy" ? "positive" : action === "Sell" ? "negative" : "neutral",
      action,
      currentPrice: stockData.currentPrice,
      change: stockData.change,
      changePercent: stockData.changePercent,
      trend: stockData.trend,
      reason: `Based on sentiment analysis of ${articles.length} recent news headlines for "${company}".`,
      news: articles.map((a) => ({ title: a.title, url: a.url })),
    });
  } catch (error) {
    console.error("Error in /api/sentiment:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error || error.message || "Error processing request" });
  }
}
