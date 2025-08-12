import { useState } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">
        Stocksy — Stock Sentiment AI Assistant
      </h1>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-8">
        <input
          type="text"
          placeholder='Ask e.g. "Shall I buy Tesla?"'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Analyzing..." : "Get Recommendation"}
        </button>
      </form>

      {error && (
        <p className="max-w-xl mx-auto text-red-600 font-semibold">{error}</p>
      )}

      {result && (
        <section className="max-w-xl mx-auto bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-semibold mb-2">Recommendation</h2>
          <p className="mb-2">
            <strong>Action:</strong> {result.action}
          </p>
          <p className="mb-4">
            <strong>Sentiment:</strong> {result.sentiment}
          </p>
          <p className="mb-4 italic">{result.reason}</p>

          <h3 className="text-xl font-semibold mb-2">Related News</h3>
          <ul className="list-disc list-inside space-y-2">
            {result.news.map((item, i) => (
              <li key={i}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
