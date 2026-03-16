import { useEffect, useRef, useState } from "react";
import { createStreamSocket } from "../api";

const SYSTEM_PROMPT =
  "You are an expert ERP assistant. Help with project management, HR, task planning, and business operations. Be concise and professional.";

export default function AIChat() {
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Clean up WS on unmount
  useEffect(() => {
    return () => wsRef.current?.close();
  }, []);

  function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingText("");

    // Lazy-init or reuse WS
    if (!wsRef.current || wsRef.current.readyState > 1) {
      wsRef.current = createStreamSocket(
        (token) => setStreamingText((prev) => prev + token),
        (full) => {
          setMessages((prev) => [...prev, { role: "assistant", content: full }]);
          setStreamingText("");
          setStreaming(false);
        },
        (err) => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `⚠ Error: ${err}` },
          ]);
          setStreamingText("");
          setStreaming(false);
        }
      );

      wsRef.current.onopen = () => {
        wsRef.current.send(
          JSON.stringify({ prompt: text, system: SYSTEM_PROMPT })
        );
      };
    } else {
      wsRef.current.send(
        JSON.stringify({ prompt: text, system: SYSTEM_PROMPT })
      );
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMessages([]);
    setStreamingText("");
    wsRef.current?.close();
    wsRef.current = null;
  }

  return (
    <div className="panel chat-panel">
      <div className="panel-header">
        <h2>ERP AI Chat</h2>
        <button className="btn-sm" onClick={clearChat} disabled={streaming}>
          Clear
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !streaming && (
          <p className="muted chat-empty">
            Ask anything about projects, HR, tasks, or the ERP system.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <span className="bubble-role">{m.role === "user" ? "You" : "AI"}</span>
            <p>{m.content}</p>
          </div>
        ))}

        {streaming && (
          <div className="bubble assistant streaming">
            <span className="bubble-role">AI</span>
            <p>{streamingText || <span className="cursor">▍</span>}</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          rows={2}
          placeholder="Ask the ERP assistant… (Enter to send)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={streaming}
        />
        <button onClick={send} disabled={streaming || !input.trim()}>
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
