import { useState } from "react";
import { generateDescription } from "../api";

const CONTEXTS = ["project", "task", "job posting", "feature", "module", "sprint"];

export default function AIDescribe() {
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("task");
  const [language, setLanguage] = useState("English");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      setResult(await generateDescription(title, context, language));
    } catch (err) {
      setError(err?.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (result) navigator.clipboard.writeText(result.description);
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Generate Description</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <label>Title</label>
        <input
          placeholder="e.g. Migrate database to PostgreSQL"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="row-fields">
          <div>
            <label>Context</label>
            <select value={context} onChange={(e) => setContext(e.target.value)}>
              {CONTEXTS.map((c) => <option key={c}>{c}</option>)}
            </select>
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

        <button type="submit" disabled={loading || !title.trim()}>
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {result && (
        <div className="result-box">
          <div className="result-header">
            <p className="result-label">
              Description <span className="muted">({result.model})</span>
            </p>
            <button className="btn-sm" onClick={copyToClipboard}>Copy</button>
          </div>
          <p>{result.description}</p>
        </div>
      )}
    </div>
  );
}
