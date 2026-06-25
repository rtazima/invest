"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createUntypedServerClient } from "@/lib/supabase/untyped";
import { extractResearch } from "@/lib/research/extract";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const HOUSES = new Set(["xp", "btg"]);

export interface UploadResult {
  success: boolean;
  reportId?: string;
  observations?: number;
  needsReview?: boolean;
  error?: string;
}

export async function processResearchUpload(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  const house = String(formData.get("house") ?? "").toLowerCase();

  if (!HOUSES.has(house)) return { success: false, error: "Casa inválida (use XP ou BTG)." };
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Selecione um arquivo PDF." };
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return { success: false, error: "O arquivo precisa ser um PDF." };
  if (file.size > MAX_BYTES) return { success: false, error: "PDF acima de 15 MB." };

  const supabase = await createUntypedServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data: familyId, error: famErr } = await supabase.rpc("my_family_id");
  if (famErr || !familyId) return { success: false, error: "Família não encontrada para o usuário." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex");

  // Dedup por hash dentro da família
  const { data: existing } = await supabase
    .from("research_reports")
    .select("id")
    .eq("family_id", familyId)
    .eq("file_hash", hash)
    .maybeSingle();
  if (existing) return { success: false, error: "Esse relatório já foi importado." };

  // Guarda o PDF original no bucket privado
  const storagePath = `${familyId}/${hash}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("research")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });
  if (upErr && !/exists/i.test(upErr.message)) {
    return { success: false, error: `Falha ao guardar o PDF: ${upErr.message}` };
  }

  // Extração via Claude (PDF nativo, saída por schema)
  let extraction;
  try {
    extraction = await extractResearch(buffer.toString("base64"), house);
  } catch (err) {
    return { success: false, error: `Falha na extração: ${err instanceof Error ? err.message : "erro"}` };
  }
  if (!extraction) {
    await supabase.from("research_reports").insert({
      family_id: familyId,
      house,
      file_hash: hash,
      storage_path: storagePath,
      status: "failed",
      model: "claude-opus-4-7",
    });
    return { success: false, error: "O modelo não conseguiu extrair o relatório." };
  }

  const obs = extraction.observations.map((o) => ({
    ...o,
    needs_review: o.confidence < 0.6 || !o.ticker,
  }));
  const needsReview = obs.some((o) => o.needs_review);

  const { data: report, error: repErr } = await supabase
    .from("research_reports")
    .insert({
      family_id: familyId,
      house,
      report_type: extraction.report_type,
      report_date: extraction.report_date,
      title: extraction.title,
      scenario_summary: extraction.scenario_summary,
      top_picks: extraction.top_picks,
      file_hash: hash,
      storage_path: storagePath,
      status: needsReview ? "needs_review" : "processed",
      model: "claude-opus-4-7",
    })
    .select("id")
    .single();
  if (repErr || !report) return { success: false, error: `Falha ao gravar relatório: ${repErr?.message}` };

  if (obs.length > 0) {
    const rows = obs.map((o) => ({
      family_id: familyId,
      report_id: report.id,
      ticker: o.ticker,
      asset_name: o.asset_name,
      rating: o.rating,
      rating_canonical: o.rating_canonical,
      target_price: o.target_price,
      currency: o.currency,
      horizon: o.horizon,
      rationale: o.rationale,
      confidence: o.confidence,
      source_page: o.source_page,
      needs_review: o.needs_review,
    }));
    const { error: obsErr } = await supabase.from("research_observations").insert(rows);
    if (obsErr) return { success: false, error: `Relatório salvo, mas falhou ao gravar observações: ${obsErr.message}` };
  }

  revalidatePath("/research");
  return { success: true, reportId: report.id, observations: obs.length, needsReview };
}
