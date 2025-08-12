import axios from "axios";

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = "ProsusAI/finbert";

function decideAction(sentiments) {
  const counts = { positive: 0, negative: 0, neutral: 0 };
  sentiments.forEach((s) => {
    counts[s] = (counts[s] || 0) + 1;
  });
  if (counts.positive > counts.negative && counts.positive > counts.neutral)
    return "Buy";
  if (counts.negative > counts.positive && counts.negative > counts.neutral)
    return "Sell";
  return "Hold";
}

function extractCompany(prompt) {
  const regex = /\b(?:buy|sell|hold|should i buy|should i sell|should i hold)\s+([a-zA-Z.\s]+)/i;
  const match = prompt.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  const company = extractCompany(prompt);
  if (!company)
    return res
      .status(400)
      .json({ error: "Could not extract company name or symbol" });

  try {
    // Fetch news articles
    const newsRes = await axios.get(
      "https://newsapi.org/v2/everything",
      {
        params: {
          q: company,
          language: "en",
          sortBy: "relevance",
          pageSize: 5,
          apiKey: NEWSAPI_KEY,
        },
      }
    );

    const articles = newsRes.data.articles;
    if (!articles || articles.length === 0) {
      return res
        .status(404)
        .json({ error: "No recent news found for this company" });
    }

    // Analyze sentiment for each headline
    const sentiments = [];

    for (const article of articles) {
      const input = article.title;

      const hfRes = await axios.post(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        { inputs: input },
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
          },
        }
      );

      const result = hfRes.data[0];
      let label = result.label.toLowerCase();

      if (label === "positive") label = "positive";
      else if (label === "negative") label = "negative";
      else label = "neutral";

      sentiments.push(label);
    }

    const action = decideAction(sentiments);

    res.status(200).json({
      sentiment: action === "Buy" ? "positive" : action === "Sell" ? "negative" : "neutral",
      action,
      reason: `Based on sentiment analysis of ${articles.length} recent news headlines for "${company}".`,
      news: articles.map((a) => ({
        title: a.title,
        url: a.url,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Error processing request" });
  }
}
