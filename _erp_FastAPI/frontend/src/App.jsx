import { useState } from "react";
import { logout, getToken } from "./api";
import Login from "./components/Login";
import AIStatus from "./components/AIStatus";
import AIChat from "./components/AIChat";
import AISummarize from "./components/AISummarize";
import AIDescribe from "./components/AIDescribe";

const TABS = [
  { id: "chat",      label: "💬 Chat" },
  { id: "summarize", label: "📄 Summarize" },
  { id: "describe",  label: "✏️ Describe" },
  { id: "status",    label: "⚙️ Status" },
];

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState("chat");

  function handleLogout() {
    logout();
    setAuthed(false);
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">🤖 ERP AI</span>
        <nav className="tab-nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button className="btn-logout" onClick={handleLogout}>Sign out</button>
      </header>

      <main className="app-main">
        {tab === "chat"      && <AIChat />}
        {tab === "summarize" && <AISummarize />}
        {tab === "describe"  && <AIDescribe />}
        {tab === "status"    && <AIStatus />}
      </main>
    </div>
  );
}
