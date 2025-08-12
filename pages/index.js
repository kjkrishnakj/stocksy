"use client"

import axios from "axios"
import { useState } from "react"

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await axios.post("/api/sentiment", { prompt })
      setResult(response.data)
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Failed to fetch sentiment"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%23ffffff fill-opacity=0.02%3E%3Ccircle cx=30 cy=30 r=1/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="pt-20 pb-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-6xl md:text-7xl font-black mb-2 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent drop-shadow-2xl">
              Stocksy
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 font-light tracking-wide">
              AI-Powered Stock Sentiment Assistant
            </p>
            <div className="mt-4 w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
          </div>
        </div>

        {/* Input Form */}
        <div className="px-6 mb-16">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <input
                type="text"
                placeholder='Ask me anything about stocks... e.g. "Should I buy Tesla?"'
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="relative w-full p-8 text-lg bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 placeholder-gray-400 transition-all duration-300 shadow-2xl"
                required
                disabled={loading}
              />
            </div>

            <div className="mt-8 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="relative w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white py-5 px-8 rounded-3xl font-bold text-lg transition-all duration-300 shadow-2xl hover:shadow-blue-500/25 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing Market Sentiment...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Get Stock Recommendation
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 mb-12">
            <div className="max-w-3xl mx-auto bg-gradient-to-r from-red-900/30 to-red-800/30 backdrop-blur-sm border border-red-700/50 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-300 font-medium text-center">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="px-6 pb-20">
            <div className="max-w-3xl mx-auto bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5"></div>
              <div className="relative z-10">
                {/* Recommendation Header */}
                <div className="mb-10">
                  <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Market Analysis
                  </h2>

                  <div className="flex justify-center mb-8">
                    <div className="relative group">
                      <div
                        className={`absolute -inset-2 rounded-full blur opacity-50 ${
                          result.action?.toLowerCase() === "buy"
                            ? "bg-green-500"
                            : result.action?.toLowerCase() === "sell"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                      ></div>
                      <span
                        className={`relative px-8 py-4 rounded-full text-xl font-black tracking-wider shadow-2xl ${
                          result.action?.toLowerCase() === "buy"
                            ? "bg-gradient-to-r from-green-600 to-green-700 text-white"
                            : result.action?.toLowerCase() === "sell"
                            ? "bg-gradient-to-r from-red-600 to-red-700 text-white"
                            : "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black"
                        }`}
                      >
                        {result.action}
                      </span>
                    </div>
                  </div>

                  <div className="text-center mb-8">
                    <p className="text-gray-400 text-sm uppercase tracking-widest mb-3 font-semibold">
                      Market Sentiment
                    </p>
                    <div className="relative inline-block">
                      <p
                        className={`text-2xl font-bold ${
                          result.sentiment?.toLowerCase().includes("positive")
                            ? "text-green-400"
                            : result.sentiment?.toLowerCase().includes("negative")
                            ? "text-red-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {result.sentiment}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-10 p-8 bg-gradient-to-br from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-2xl border border-gray-600/30 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <svg
                      className="w-6 h-6 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <h3 className="text-xl font-bold text-blue-400">Analysis Summary</h3>
                  </div>
                  <p className="text-gray-200 leading-relaxed text-lg">{result.reason}</p>
                </div>

                {result.news && result.news.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <svg
                        className="w-6 h-6 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                        />
                      </svg>
                      <h3 className="text-xl font-bold text-blue-400">Related News</h3>
                    </div>
                    <div className="space-y-4">
                      {result.news.map((item, i) => (
                        <div key={i} className="relative group">
                          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative block p-6 bg-gradient-to-br from-gray-800/40 to-gray-700/40 backdrop-blur-sm hover:from-gray-700/60 hover:to-gray-600/60 border border-gray-600/30 hover:border-blue-500/50 rounded-2xl transition-all duration-300 group shadow-lg hover:shadow-2xl transform hover:scale-[1.02]"
                          >
                            <p className="text-white group-hover:text-blue-300 transition-colors duration-300 leading-relaxed text-lg font-medium">
                              {item.title}
                            </p>
                            <div className="flex items-center mt-3 text-gray-400 text-sm">
                              <span className="group-hover:text-blue-400 transition-colors duration-300">
                                Read full article
                              </span>
                              <svg
                                className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:text-blue-400 transition-all duration-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
