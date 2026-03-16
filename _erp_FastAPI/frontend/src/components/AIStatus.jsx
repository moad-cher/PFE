import { useEffect, useState } from "react";
import { fetchAIStatus } from "../api";

export default function AIStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setStatus(await fetchAIStatus());
    } catch {
      setError("Could not reach backend");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Ollama Status</h2>
        <button className="btn-sm" onClick={load} disabled={loading}>Refresh</button>
      </div>

      {loading && <p className="muted">Checking…</p>}
      {error && <p className="error">{error}</p>}

      {status && (
        <>
          <div className={`status-badge ${status.reachable ? "ok" : "fail"}`}>
            {status.reachable ? "● Reachable" : "● Unreachable"}
          </div>
          <p><strong>Active model:</strong> {status.model}</p>
          <p><strong>Available models:</strong></p>
          <ul className="model-list">
            {status.models.map((m) => (
              <li key={m} className={m === status.model ? "active-model" : ""}>{m}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
