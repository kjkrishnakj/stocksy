"use client";

import axios from "axios";
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("sentiment");
  const [listening, setListening] = useState(false);

  let recognition;
  if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
  }

  const handleVoiceInput = () => {
    if (!recognition) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      recognition.start();
      setListening(true);

      recognition.onresult = (event) => {
        const speechText = event.results[0][0].transcript;
        setPrompt(speechText);
        setListening(false);
      };

      recognition.onerror = () => {
        setListening(false);
      };
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const endpoint =
        mode === "sentiment" ? "/api/sentiment" : "/api/backtest";
      const response = await axios.post(endpoint, { prompt });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>

      <div className="relative z-10">
        <div className="pt-20 pb-10 px-6 text-center">
          <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-2xl">
            Stocksy
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mt-2">
            AI-Powered Stock Insights
          </p>

          <div className="flex justify-center mt-6 gap-4">
            <button
              onClick={() => setMode("sentiment")}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                mode === "sentiment"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Sentiment Analysis
            </button>
            <button
              onClick={() => setMode("backtest")}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                mode === "backtest"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              Backtesting
            </button>
          </div>
        </div>

        <div className="px-6 mb-10">
  <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center gap-3">
    <input
      type="text"
      placeholder={
        mode === "sentiment"
          ? 'e.g. "Should I buy Tesla?"'
          : 'e.g. "Backtest Tesla for last month"'
      }
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      className="w-full p-6 bg-gray-900 border border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 text-lg"
      disabled={loading}
      required
    />

    {/* Voice Input Button */}
    <button
      type="button"
      onClick={handleVoiceInput}
      className={`p-4 rounded-full transition-all duration-300 shadow-md 
  ${
    listening
      ? "bg-red-600 animate-pulse shadow-red-500/50"
      : "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-blue-500/30 hover:shadow-blue-500/50"
  }`}

      title={listening ? "Listening..." : "Start voice input"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3zm-9 10a9 9 0 0018 0h-2a7 7 0 01-14 0H3z"
        />
      </svg>
    </button>
  </form>

  {/* ✅ Centered and responsive button */}
  <div className="flex justify-center mt-6">
  <button
    onClick={handleSubmit}
    disabled={loading || !prompt.trim()}
    className="w-[60%] sm:w-[55%] md:w-[45%] lg:w-[40%] py-4 rounded-2xl 
               bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 
               hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 
               disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed 
               font-bold text-lg text-white 
               shadow-lg hover:shadow-blue-500/40 
               transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
  >
    {loading
      ? "Analyzing..."
      : mode === "sentiment"
      ? "Analyze Sentiment"
      : "Run Backtest"}
  </button>
</div>

</div>


        {error && (
          <div className="max-w-3xl mx-auto bg-red-900/30 border border-red-700/50 p-4 rounded-2xl text-center">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="px-6 pb-20">
            <div className="max-w-3xl mx-auto bg-gray-900/70 border border-gray-700 rounded-3xl p-8 shadow-2xl">
              {mode === "sentiment" && (
                <>
                  <h2 className="text-3xl font-bold text-center mb-6">
                    Market Sentiment
                  </h2>
                  <p className="text-center text-lg mb-4">{result.reason}</p>

                  <div
                    className={`text-center text-2xl font-bold mb-4 ${
                      result.sentiment.toLowerCase() === "positive"
                        ? "text-green-400"
                        : result.sentiment.toLowerCase() === "negative"
                        ? "text-red-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {result.action} — {result.sentiment}
                  </div>

                  {result.news && result.news.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xl font-semibold mb-2">
                        Recent News:
                      </h3>
                      <ul className="space-y-2 max-h-64 overflow-y-auto">
                        {result.news.map((item, idx) => (
                          <li key={idx} className="p-2 bg-gray-800 rounded-xl">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-blue-300"
                            >
                              {item.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-center text-gray-300 mt-4">
                    Current Price: ${result.currentPrice?.toFixed(2)} (
                    {result.trend})
                  </div>
                </>
              )}

              {mode === "backtest" && result.backtestResult && (
                <>
                  <h2 className="text-3xl font-bold text-center mb-6">
                    Backtesting Result for {result.symbol}
                  </h2>
                  <p className="text-center text-lg mb-6">{result.reason}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-center mb-8">
                    <div>
                      <p className="text-gray-400 text-sm">Buy Price</p>
                      <p className="text-xl font-semibold">
                        ${result.backtestResult.buyPrice}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Sell Price</p>
                      <p className="text-xl font-semibold">
                        ${result.backtestResult.sellPrice}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Return</p>
                      <p
                        className={`text-xl font-semibold ${
                          result.backtestResult.returnPct > 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {result.backtestResult.returnPct}%
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={result.historicalData}
                        margin={{ top: 20, right: 50, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                          dataKey="time"
                          stroke="#aaa"
                          interval={Math.floor(result.historicalData.length / 10)}
                          angle={-45}
                          textAnchor="end"
                          tickFormatter={(dateStr) => {
                            const d = new Date(dateStr);
                            return d.toLocaleDateString("en-US", {
                              day: "2-digit",
                              month: "short",
                            });
                          }}
                        />
                        <YAxis stroke="#aaa" domain={["auto", "auto"]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#222", border: "none" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="close"
                          stroke="#60a5fa"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <p className="text-center mt-12 text-lg text-gray-300 font-semibold">
                    {result.backtestResult.recommendation}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
