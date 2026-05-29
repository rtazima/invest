"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Session {
  id: string;
  title: string;
  scope_type: string;
  scope_holder_id: string | null;
  updated_at: string;
  preview: string;
  message_count: number;
}

interface HolderOption {
  id: string;
  name: string;
}

interface Props {
  onClose: () => void;
  isOwner: boolean;
  holders: HolderOption[];
  defaultHolderId?: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
}

export function ChatPanel({ onClose, isOwner, holders, defaultHolderId }: Props) {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scopeType, setScopeType] = useState<"family" | "holder">(
    isOwner ? "family" : "holder",
  );
  const [selectedHolderId, setSelectedHolderId] = useState(
    defaultHolderId ?? holders[0]?.id ?? "",
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (view === "chat") inputRef.current?.focus();
  }, [view]);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (res.ok) setSessions(await res.json() as Session[]);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  function startNewChat() {
    setMessages([]);
    setSessionId(null);
    setView("chat");
    inputRef.current?.focus();
  }

  async function loadSession(s: Session) {
    setSessionId(s.id);
    setScopeType(s.scope_type as "family" | "holder");
    if (s.scope_holder_id) setSelectedHolderId(s.scope_holder_id);
    setView("chat");

    const res = await fetch(`/api/chat/sessions/${s.id}`);
    if (res.ok) {
      const msgs = await res.json() as { role: string; content: string }[];
      setMessages(msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    const scope =
      scopeType === "family"
        ? { type: "family" as const }
        : { type: "holder" as const, holderId: selectedHolderId };

    const allMessages = [...messages, { role: "user" as const, content: userMessage }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, scope, sessionId }),
      });

      if (!res.ok || !res.body) throw new Error("Erro na requisição");

      const newSessionId = res.headers.get("X-Session-Id");
      if (newSessionId && !sessionId) {
        setSessionId(newSessionId);
        fetchSessions();
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            fetchSessions();
            break;
          }
          try {
            const parsed = JSON.parse(data) as { text: string };
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + parsed.text };
              }
              return updated;
            });
          } catch {
            // linha inválida, ignora
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao processar. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "80px",
    right: "1.5rem",
    width: "380px",
    height: "560px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    zIndex: 100,
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  };

  const iconBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    fontSize: "13px",
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text)", flex: 1 }}>
          Opus
        </span>

        {view === "chat" && isOwner && (
          <select
            value={scopeType === "family" ? "family" : selectedHolderId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "family") setScopeType("family");
              else { setScopeType("holder"); setSelectedHolderId(val); }
            }}
            style={{
              fontSize: "11px",
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text)",
              padding: "3px 6px",
              cursor: "pointer",
            }}
          >
            <option value="family">Família</option>
            {holders.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}

        {/* Nova conversa */}
        <button
          onClick={startNewChat}
          style={iconBtnStyle}
          title="Nova conversa"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 2v10M2 7h10" />
          </svg>
        </button>

        {/* Histórico */}
        <button
          onClick={() => setView(view === "history" ? "chat" : "history")}
          style={{ ...iconBtnStyle, color: view === "history" ? "var(--color-text)" : "var(--color-text-muted)" }}
          title="Histórico"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5" />
            <path d="M7 4.5V7l2 1.5" />
          </svg>
        </button>

        <button onClick={onClose} style={iconBtnStyle} aria-label="Fechar">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l10 10M11 1L1 11" />
          </svg>
        </button>
      </div>

      {/* Histórico de sessões */}
      {view === "history" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {sessions.length === 0 ? (
            <p style={{ color: "var(--color-text-faint)", fontSize: "12px", textAlign: "center", marginTop: "2rem" }}>
              Nenhuma conversa salva ainda.
            </p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSession(s)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: s.id === sessionId ? "var(--color-border-subtle)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-border-subtle)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = s.id === sessionId ? "var(--color-border-subtle)" : "none"; }}
              >
                <span style={{ fontSize: "12.5px", color: "var(--color-text)", fontWeight: 500, lineHeight: 1.3 }}>
                  {s.title}
                </span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>
                    {formatRelative(s.updated_at)}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-faint)" }}>·</span>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.preview || "Sem mensagens"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Chat */}
      {view === "chat" && (
        <>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: "var(--color-text-faint)", fontSize: "12.5px", textAlign: "center", marginTop: "2.5rem", lineHeight: 1.6 }}>
                Pergunte sobre seu portfólio, peça análises ou sugestões de alocação.
              </p>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "88%",
                    padding: "8px 11px",
                    borderRadius: msg.role === "user"
                      ? "12px 12px 3px 12px"
                      : "12px 12px 12px 3px",
                    backgroundColor: msg.role === "user" ? "var(--color-brand)" : "var(--color-bg-2)",
                    border: msg.role === "assistant" ? "1px solid var(--color-border)" : "none",
                    color: msg.role === "user" ? "white" : "var(--color-text)",
                    fontSize: "12.5px",
                    lineHeight: "1.55",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content || (loading && msg.role === "assistant" ? (
                    <span style={{ color: "var(--color-text-faint)" }}>pensando…</span>
                  ) : "")}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={sendMessage}
            style={{
              padding: "10px",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva uma mensagem..."
              disabled={loading}
              style={{
                flex: 1,
                padding: "7px 10px",
                backgroundColor: "var(--color-bg)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text)",
                fontSize: "12.5px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: "7px 12px",
                backgroundColor: loading || !input.trim() ? "var(--color-border)" : "var(--color-brand)",
                border: "none",
                borderRadius: "var(--radius-md)",
                color: "white",
                fontSize: "12.5px",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                flexShrink: 0,
                transition: "background-color 0.1s",
              }}
            >
              {loading ? "…" : "Enviar"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
