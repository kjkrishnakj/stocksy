import axios from "axios";

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_KEY;

const symbolMap = {
  TESLA: "TSLA",
  APPLE: "AAPL",
  MICROSOFT: "MSFT",
  GOOGLE: "GOOGL",
  AMAZON: "AMZN",
  NVIDIA: "NVDA",
  META: "META",
  NETFLIX: "NFLX",
};

function parseQuery(query) {
  if (!query) return { symbol: "AAPL", days: 30 };

  query = query.toUpperCase();

  let symbol = null;
  for (let name in symbolMap) {
    if (query.includes(name)) {
      symbol = symbolMap[name];
      break;
    }
  }

  if (!symbol) {
    const words = query.match(/[A-Z]+/g);
    symbol = words?.[0] || "AAPL";
  }

  const timeMatch = query.match(/(\d+)\s*(day|week|month|year)s?/i);
  let days = 30;
  if (timeMatch) {
    const n = parseInt(timeMatch[1]);
    const unit = timeMatch[2].toLowerCase();
    if (unit.includes("day")) days = n;
    else if (unit.includes("week")) days = n * 7;
    else if (unit.includes("month")) days = n * 30;
    else if (unit.includes("year")) days = n * 365;
  }

  return { symbol, days };
}

async function fetchHistoricalData(symbol, days) {
  if (!TWELVE_DATA_KEY) throw new Error("Twelve Data API key not set");

  // Use weekly interval if days > 60 to bypass free tier daily limit
  const interval = days > 60 ? "1week" : "1day";
  const outputsize = days > 60 ? Math.max(Math.ceil(days / 7), 52) : days;

  const url = "https://api.twelvedata.com/time_series";
  const params = { symbol, interval, outputsize, format: "JSON", apikey: TWELVE_DATA_KEY };

  const res = await axios.get(url, { params });
  const data = res.data;

  if (data.status === "error" || !data.values || data.values.length === 0) {
    throw new Error(`Twelve Data API error: ${data.message || JSON.stringify(data)}`);
  }

  // Reverse oldest first and slice last N days/weeks
  return data.values
    .reverse()
    .slice(-Math.ceil(days / (interval === "1week" ? 7 : 1)))
    .map((d) => ({
      time: d.datetime,
      open: parseFloat(d.open),
      high: parseFloat(d.high),
      low: parseFloat(d.low),
      close: parseFloat(d.close),
    }));
}

function simulateStrategy(data) {
  if (data.length < 2)
    return { buyPrice: 0, sellPrice: 0, profit: 0, returnPct: 0, recommendation: "Not enough data" };

  const buy = data[0].close;
  const sell = data[data.length - 1].close;
  const profit = sell - buy;
  const returnPct = ((profit / buy) * 100).toFixed(2);

  return {
    buyPrice: buy,
    sellPrice: sell,
    profit: profit.toFixed(2),
    returnPct,
    recommendation: profit > 0 ? "Profitable (Buy Signal Valid)" : "Loss (Sell Signal Better)",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    const { symbol, days } = parseQuery(prompt);
    const historicalData = await fetchHistoricalData(symbol, days);
    const backtestResult = simulateStrategy(historicalData);

    res.status(200).json({
      symbol,
      days,
      backtestResult,
      historicalData,
      reason: `Backtest simulation for ${symbol} over last ${days} days using Twelve Data (${days > 60 ? "weekly" : "daily"} data).`,
    });
  } catch (error) {
    console.error("Backtest API Error:", error.message || error);
    res.status(500).json({ error: error.message || "Failed to process backtest" });
  }
}
