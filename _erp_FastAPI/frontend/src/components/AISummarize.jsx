import { useState } from "react";
import { summarizeText } from "../api";

export default function AISummarize() {
  const [text, setText] = useState("");
  const [maxWords, setMaxWords] = useState(80);
  const [language, setLanguage] = useState("English");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await summarizeText(text, maxWords, language));
    } catch (err) {
      setError(err?.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Summarize Text</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <label>Text to summarize</label>
        <textarea
          rows={6}
          placeholder="Paste any text — meeting notes, project description, resume…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />

        <div className="row-fields">
          <div>
            <label>Max words (20–500)</label>
            <input
              type="number"
              min={20}
              max={500}
              value={maxWords}
              onChange={(e) => setMaxWords(Number(e.target.value))}
            />
          </div>
          <div>
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>French</option>
              <option>Arabic</option>
              <option>Spanish</option>
              <option>German</option>
            </select>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Summarizing…" : "Summarize"}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <p className="result-label">Summary <span className="muted">({result.model})</span></p>
          <p>{result.summary}</p>
        </div>
      )}
    </div>
  );
}
