import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export const SYNTHESIS_MODEL = "claude-opus-4-7" as const;

export async function runLlmMessage(params: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const { model, system, user, maxTokens = 2048 } = params;

  if (model === "claude-opus-4-7" || model.startsWith("claude-")) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");

    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });

    const block = msg.content[0];
    if (block?.type !== "text") throw new Error("Resposta inesperada da Anthropic");
    return block.text;
  }

  if (model === "gpt-4o" || model.startsWith("gpt-")) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = completion.choices[0]?.message.content;
    if (!text) throw new Error("Resposta vazia da OpenAI");
    return text;
  }

  throw new Error(`Modelo não suportado: ${model}`);
}
