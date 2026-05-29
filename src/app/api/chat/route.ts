import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";
import { getPortfolioSummary } from "@/lib/data/portfolio";
import { getHolders } from "@/lib/data/holders";
import { getLatestPositions } from "@/lib/data/positions";
import { getAlerts } from "@/lib/data/alerts";
import { getStrategy } from "@/lib/data/strategies";
import { formatBRL } from "@/lib/decimal";
import Decimal from "decimal.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  scope: { type: "family" } | { type: "holder"; holderId: string };
  sessionId?: string;
}

function pct(part: Decimal, total: Decimal): string {
  if (total.isZero()) return "0%";
  return `${part.div(total).times(100).toFixed(1)}%`;
}

async function buildContext(scope: ChatRequest["scope"]): Promise<string> {
  const [summary, allPositions, alerts, holders] = await Promise.all([
    getPortfolioSummary(),
    getLatestPositions(),
    getAlerts({ status: "unread", limit: 50 }),
    getHolders(),
  ]);

  const holderMap = new Map(holders.map((h) => [h.id, h]));

  const positions =
    scope.type === "holder"
      ? allPositions.filter((p) => p.holder_id === scope.holderId)
      : allPositions;

  const strategies = await Promise.all(
    holders.map(async (h) => {
      const s = await getStrategy(h.id);
      return s ? { holder: h.name, strategy: s } : null;
    }),
  ).then((r) => r.filter(Boolean));

  const lines: string[] = [];

  if (scope.type === "holder") {
    const holderSummary = summary.byHolder.find((h) => h.holder.id === scope.holderId);
    const holderName = holderSummary?.holder.name ?? "Titular";
    lines.push(`=== Portfólio de ${holderName} ===`);
    lines.push(`Patrimônio: ${formatBRL(holderSummary?.totalBrl ?? new Decimal(0))}`);
  } else {
    lines.push("=== Portfólio consolidado da família ===");
    lines.push(`Patrimônio total: ${formatBRL(summary.totalBrl)}`);
    lines.push("");
    lines.push("Por titular:");
    for (const h of summary.byHolder) {
      lines.push(`  ${h.holder.name}: ${formatBRL(h.totalBrl)} (${pct(h.totalBrl, summary.totalBrl)})`);
    }
  }

  lines.push("", "Por classe de ativo:");
  for (const [cls, val] of Object.entries(summary.byAssetClass)) {
    if (val.isZero()) continue;
    lines.push(`  ${cls}: ${formatBRL(val)} (${pct(val, summary.totalBrl)})`);
  }

  lines.push("", "Por instituição:");
  for (const [inst, val] of Object.entries(summary.byInstitution)) {
    if (val.isZero()) continue;
    lines.push(`  ${inst.toUpperCase()}: ${formatBRL(val)} (${pct(val, summary.totalBrl)})`);
  }

  if (positions.length > 0) {
    lines.push("", "Posições completas:");
    const sorted = [...positions].sort((a, b) => b.marketValueBrl.cmp(a.marketValueBrl));
    for (const p of sorted) {
      const holder = scope.type === "family" ? ` [${holderMap.get(p.holder_id)?.name ?? "?"}]` : "";
      const ticker = p.ticker ? ` (${p.ticker})` : "";
      const pnlStr = p.pnlDecimal ? ` | P&L: ${formatBRL(p.pnlDecimal)} (${p.pnlPctDecimal?.times(100).toFixed(2) ?? "—"}%)` : "";
      lines.push(
        `  ${p.name}${ticker}${holder}: ${formatBRL(p.marketValueBrl)} — ${p.asset_class} · ${p.institution.toUpperCase()}${pnlStr}`,
      );
    }
  }

  if (strategies.length > 0) {
    lines.push("", "Estratégias:");
    for (const s of strategies) {
      if (!s) continue;
      lines.push(`  ${s.holder} — perfil: ${s.strategy.risk_profile}`);
      if (s.strategy.notes) lines.push(`    Notas: ${s.strategy.notes}`);
      if (s.strategy.allocations.length > 0) {
        lines.push("    Alocações-alvo:");
        for (const a of s.strategy.allocations) {
          lines.push(
            `      ${a.asset_class}: ${(a.target_pct * 100).toFixed(0)}% ±${(a.tolerance_pct * 100).toFixed(0)}%${a.rationale ? ` — ${a.rationale}` : ""}`,
          );
        }
      }
    }
  }

  if (alerts.length > 0) {
    lines.push("", `Alertas ativos (${alerts.length}):`);
    for (const a of alerts) {
      lines.push(`  [${a.severity.toUpperCase()}] ${a.title}`);
      if (a.description) lines.push(`    ${a.description}`);
      if (a.recommendation) lines.push(`    Recomendação: ${a.recommendation}`);
    }
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Não autorizado", { status: 401 });

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return new Response("ANTHROPIC_API_KEY não configurada", { status: 500 });

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const { messages, scope, sessionId } = body;
  const userMessage = messages[messages.length - 1];
  if (!userMessage) return new Response("Mensagem inválida", { status: 400 });

  // Cria sessão nova se não veio sessionId
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const title = userMessage.content.slice(0, 60);
    const { data: session, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        title,
        scope_type: scope.type,
        scope_holder_id: scope.type === "holder" ? scope.holderId : null,
      })
      .select("id")
      .single();

    if (error || !session) return new Response("Erro ao criar sessão", { status: 500 });
    activeSessionId = session.id as string;
  }

  await supabase.from("chat_messages").insert({
    session_id: activeSessionId,
    role: "user",
    content: userMessage.content,
  });

  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", activeSessionId);

  const context = await buildContext(scope);

  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    system: `Você é um assistente financeiro especializado integrado à plataforma Invest.
Analise portfólios, responda perguntas sobre alocação, P&L, risco e estratégia de investimentos.

${context}

Seja direto e use os números do contexto quando relevante.
Responda em português brasileiro informal. Formato: prosa ou listas curtas.`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const capturedSessionId = activeSessionId;
  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            fullResponse += chunk.delta.text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`),
            );
          }
        }
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        if (fullResponse) {
          await supabase.from("chat_messages").insert({
            session_id: capturedSessionId,
            role: "assistant",
            content: fullResponse,
          });
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Session-Id": capturedSessionId,
    },
  });
}
