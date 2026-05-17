"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
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

export function ChatPanel({ onClose, isOwner, holders, defaultHolderId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scopeType, setScopeType] = useState<"family" | "holder">(
    isOwner ? "family" : "holder",
  );
  const [selectedHolderId, setSelectedHolderId] = useState(
    defaultHolderId ?? holders[0]?.id ?? "",
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        body: JSON.stringify({ messages: allMessages, scope }),
      });

      if (!res.ok || !res.body) throw new Error("Erro na requisição");

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
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text: string };
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.text,
                };
              }
              return updated;
            });
          } catch {
            // parse error on line, skip
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

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        right: "1.5rem",
        width: "360px",
        maxHeight: "520px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text)", flex: 1 }}>
          Assistente
        </span>

        {isOwner && (
          <select
            value={scopeType === "family" ? "family" : selectedHolderId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "family") {
                setScopeType("family");
              } else {
                setScopeType("holder");
                setSelectedHolderId(val);
              }
            }}
            style={{
              fontSize: "0.75rem",
              backgroundColor: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-text)",
              padding: "0.25rem 0.5rem",
              cursor: "pointer",
            }}
          >
            <option value="family">Família toda</option>
            {holders.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "1rem",
            lineHeight: 1,
            padding: "0.25rem",
          }}
          aria-label="Fechar chat"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              color: "var(--color-text-faint)",
              fontSize: "0.8125rem",
              textAlign: "center",
              marginTop: "2rem",
            }}
          >
            Pergunte sobre seu portfólio, peça análises ou sugestões de alocação.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "0.5rem 0.75rem",
                borderRadius:
                  msg.role === "user"
                    ? "var(--radius-md) var(--radius-md) 4px var(--radius-md)"
                    : "var(--radius-md) var(--radius-md) var(--radius-md) 4px",
                backgroundColor:
                  msg.role === "user" ? "var(--color-brand)" : "var(--color-bg)",
                border:
                  msg.role === "assistant" ? "1px solid var(--color-border)" : "none",
                color: msg.role === "user" ? "white" : "var(--color-text)",
                fontSize: "0.8125rem",
                lineHeight: "1.5",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content || (loading && msg.role === "assistant" ? "…" : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: "0.75rem",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva uma mensagem..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text)",
            fontSize: "0.8125rem",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "0.5rem 0.875rem",
            backgroundColor: loading || !input.trim() ? "var(--color-border)" : "var(--color-brand)",
            border: "none",
            borderRadius: "var(--radius-md)",
            color: "white",
            fontSize: "0.8125rem",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
