import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/server";
import { getPortfolioSummary, getHolderSummary } from "@/lib/data/portfolio";
import { getHolders } from "@/lib/data/holders";
import { formatBRL } from "@/lib/decimal";
import Decimal from "decimal.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  scope: { type: "family" } | { type: "holder"; holderId: string };
}

function pct(part: Decimal, total: Decimal): string {
  if (total.isZero()) return "0%";
  return `${part.div(total).times(100).toFixed(1)}%`;
}

async function buildContext(scope: ChatRequest["scope"]): Promise<string> {
  if (scope.type === "holder") {
    const summary = await getHolderSummary(scope.holderId);
    if (!summary) return "Nenhum dado de portfólio disponível para este titular.";

    const lines = [
      `Titular: ${summary.holder.name}`,
      `Patrimônio total: ${formatBRL(summary.totalBrl)}`,
      "",
      "Por instituição:",
      ...Object.entries(summary.byInstitution).map(
        ([inst, val]) => `  ${inst.toUpperCase()}: ${formatBRL(val)} (${pct(val, summary.totalBrl)})`,
      ),
      "",
      "Por classe de ativo:",
      ...Object.entries(summary.byAssetClass).map(
        ([cls, val]) => `  ${cls}: ${formatBRL(val)} (${pct(val, summary.totalBrl)})`,
      ),
    ];

    if (summary.positions.length > 0) {
      const top5 = summary.positions
        .sort((a, b) => b.marketValueBrl.cmp(a.marketValueBrl))
        .slice(0, 5);
      lines.push("", "Top 5 posições:");
      for (const p of top5) {
        lines.push(`  ${p.name}${p.ticker ? ` (${p.ticker})` : ""}: ${formatBRL(p.marketValueBrl)}`);
      }
    }

    return lines.join("\n");
  }

  // Family scope
  const summary = await getPortfolioSummary();
  const holders = await getHolders();

  const lines = [
    `Patrimônio total da família: ${formatBRL(summary.totalBrl)}`,
    "",
    "Por titular:",
    ...summary.byHolder.map(
      (h) => `  ${h.holder.name}: ${formatBRL(h.totalBrl)} (${pct(h.totalBrl, summary.totalBrl)})`,
    ),
    "",
    "Por classe de ativo (consolidado):",
    ...Object.entries(summary.byAssetClass).map(
      ([cls, val]) => `  ${cls}: ${formatBRL(val)} (${pct(val, summary.totalBrl)})`,
    ),
    "",
    "Por instituição (consolidado):",
    ...Object.entries(summary.byInstitution).map(
      ([inst, val]) => `  ${inst.toUpperCase()}: ${formatBRL(val)} (${pct(val, summary.totalBrl)})`,
    ),
  ];

  if (holders.length > 0) {
    lines.push("", `Titulares na família: ${holders.map((h) => h.name).join(", ")}`);
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY não configurada", { status: 500 });
  }

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const { messages, scope } = body;
  const context = await buildContext(scope);

  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `Você é um assistente financeiro integrado à plataforma Invest, que ajuda a analisar portfólios de investimento.

Dados atuais do portfólio:
${context}

Seja direto e prático. Use os números acima quando relevante. Responda em português brasileiro.`,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const data = JSON.stringify({ text: chunk.delta.text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
