import axios from "axios";

const client = axios.create({ baseURL: "" });  // uses Vite proxy

// Attach token to every request
client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auth
export async function login(username, password) {
  const body = new URLSearchParams({ username, password });
  const { data } = await client.post("/auth/token", body);
  localStorage.setItem("token", data.access_token);
  return data;
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

// AI REST
export async function fetchAIStatus() {
  const { data } = await client.get("/ai/status");
  return data;
}

export async function sendChat(messages, system_prompt = "") {
  const { data } = await client.post("/ai/chat", { messages, system_prompt });
  return data; // { reply, model }
}

export async function summarizeText(text, max_words = 100, language = "English") {
  const { data } = await client.post("/ai/summarize", { text, max_words, language });
  return data; // { summary, model }
}

export async function generateDescription(title, context = "task", language = "English") {
  const { data } = await client.post("/ai/generate-description", { title, context, language });
  return data; // { description, model }
}

// AI WebSocket streaming — connects via Vite proxy at same origin
export function createStreamSocket(onToken, onDone, onError) {
  const token = getToken();
  const wsProto = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${wsProto}//${location.host}/ws/ai/stream?token=${token}`);

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "token") onToken(msg.token);
    else if (msg.type === "done") onDone(msg.full);
    else if (msg.type === "error") onError(msg.message);
  };

  ws.onerror = () => onError("WebSocket error");

  return ws;
}
