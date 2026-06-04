"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { detectFormat, parseCSV, extractCsvOwner } from "@/lib/csv";
import { parseXPXlsx, extractXPXlsxOwner } from "@/lib/xlsx/xp-xlsx-parser";
import { parseBTGXlsx, extractBTGXlsxOwner } from "@/lib/xlsx/btg-xlsx-parser";
import { parseNomadPdf, extractNomadPdfOwner } from "@/lib/pdf/nomad-pdf-parser";
import { validateDocumentOwner } from "@/lib/import/owner-validator";
import { fetchPositionsFromPluggy } from "@/lib/pluggy/client";
import type { ParsedPosition } from "@/lib/csv/types";
import { toDecimal } from "@/lib/decimal";
import Decimal from "decimal.js";
import type { Enums } from "@/types/database";

// ── Pluggy sync ────────────────────────────────────────────────────────────

// Item IDs por instituição — futuramente virão do banco por titular.
const PLUGGY_ITEM_IDS: Partial<Record<Enums<"institution">, string | undefined>> = {
  btg: process.env.PLUGGY_ITEM_ID_BTG,
};

export type PluggyInstitution = "btg";

export interface PluggySyncResult {
  success: boolean;
  rowCount?: number;
  skipped?: number;
  errorMessage?: string;
}

export async function syncPluggy(
  holderId: string,
  institution: PluggyInstitution,
): Promise<PluggySyncResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const itemId = PLUGGY_ITEM_IDS[institution];
  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!itemId)
    return { success: false, errorMessage: `Item Pluggy para ${institution.toUpperCase()} não configurado no servidor.` };
  if (!clientId || !clientSecret)
    return { success: false, errorMessage: "Credenciais Pluggy ausentes no servidor." };

  const holders = await getHolders();
  const holder = holders.find((h) => h.id === holderId);
  if (!holder) return { success: false, errorMessage: "Titular não encontrado." };

  // Remove apenas batches Pluggy anteriores para esse titular + instituição.
  // Batches CSV/XLSX/PDF são preservados como histórico; a deduplicação em
  // getLatestPositions() exclui eles do dashboard quando há um batch Pluggy ativo.
  const { data: oldPluggyBatches } = await supabase
    .from("import_batches")
    .select("id")
    .eq("holder_id", holderId)
    .eq("institution", institution)
    .eq("source", "pluggy");

  if (oldPluggyBatches && oldPluggyBatches.length > 0) {
    const oldIds = oldPluggyBatches.map((b) => b.id);
    await supabase.from("positions").delete().in("batch_id", oldIds);
    await supabase.from("import_batches").delete().in("id", oldIds);
  }

  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      holder_id: holderId,
      institution,
      status: "processing",
      source: "pluggy",
      filename: `pluggy-${institution}-${new Date().toISOString().split("T")[0]}`,
      imported_by: user.id,
    })
    .select()
    .single();

  if (batchErr || !batch)
    return { success: false, errorMessage: `Erro ao criar batch: ${batchErr?.message}` };

  try {
    const { positions, skipped } = await fetchPositionsFromPluggy(itemId, clientId, clientSecret);

    if (positions.length === 0) {
      await supabase
        .from("import_batches")
        .update({ status: "failed", error_message: "Nenhuma posição retornada pela Pluggy." })
        .eq("id", batch.id);
      return { success: false, skipped, errorMessage: "Nenhuma posição válida retornada pela Pluggy." };
    }

    const rows = positions.map((p) => {
      const costBasis = p.avgPrice ? p.avgPrice.times(p.quantity) : null;
      const pnl = costBasis ? p.marketValue.minus(costBasis) : null;
      const pnlPct = costBasis?.gt(0) && pnl ? pnl.div(costBasis) : null;
      return {
        batch_id: batch.id,
        holder_id: holderId,
        institution,
        ticker: p.ticker,
        name: p.name,
        asset_class: p.assetClass,
        currency: p.currency,
        quantity: p.quantity.toNumber(),
        avg_price: p.avgPrice?.toNumber() ?? null,
        current_price: p.currentPrice?.toNumber() ?? null,
        market_value: p.marketValue.toNumber(),
        cost_basis: costBasis?.toNumber() ?? null,
        pnl: pnl?.toNumber() ?? null,
        pnl_pct: pnlPct?.toNumber() ?? null,
        exchange_rate: null,
        market_value_brl: p.marketValue.toNumber(),
        maturity_date: p.maturityDate?.toISOString().split("T")[0] ?? null,
        indexer: p.indexer,
        indexer_rate: p.indexerRate?.toNumber() ?? null,
        liquidity_days: p.liquidityDays,
        quota_value: p.quotaValue?.toNumber() ?? null,
        quota_date: p.quotaDate?.toISOString().split("T")[0] ?? null,
        raw_data: p.rawData,
      };
    });

    const { error: insertErr } = await supabase.from("positions").insert(rows);
    if (insertErr) {
      await supabase
        .from("import_batches")
        .update({ status: "failed", error_message: insertErr.message })
        .eq("id", batch.id);
      return { success: false, errorMessage: `Erro ao salvar posições: ${insertErr.message}` };
    }

    await supabase
      .from("import_batches")
      .update({ status: "completed", row_count: positions.length, completed_at: new Date().toISOString() })
      .eq("id", batch.id);

    revalidatePath("/dashboard");
    revalidatePath("/import");
    revalidatePath("/holders");

    return { success: true, rowCount: positions.length, skipped };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro inesperado";
    await supabase
      .from("import_batches")
      .update({ status: "failed", error_message: msg })
      .eq("id", batch.id);
    return { success: false, errorMessage: msg };
  }
}

// ── Importação manual (CSV/XLSX/PDF) ────────────────────────────────────────

export interface DeleteBatchResult {
  success: boolean;
  errorMessage?: string;
}

export async function deleteImportBatch(batchId: string): Promise<DeleteBatchResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, errorMessage: "Não autenticado." };

  const { error } = await supabase.from("import_batches").delete().eq("id", batchId);
  if (error) return { success: false, errorMessage: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/import");
  revalidatePath("/holders");
  return { success: true };
}

export interface ImportResult {
  success: boolean;
  batchId?: string;
  rowCount?: number;
  errors?: Array<{ row: number; field: string; message: string }>;
  errorMessage?: string;
}

export async function processCSVImport(formData: FormData): Promise<ImportResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const holderId = formData.get("holder_id") as string;
  const institution = formData.get("institution") as Enums<"institution">;
  const file = formData.get("file") as File | null;
  const exchangeRateStr = formData.get("exchange_rate") as string | null;
  const exchangeRateDateStr = formData.get("exchange_rate_date") as string | null;

  if (!holderId || !institution || !file) {
    return { success: false, errorMessage: "Titular, instituição e arquivo são obrigatórios." };
  }

  const holders = await getHolders();
  const holder = holders.find((h) => h.id === holderId);
  if (!holder) return { success: false, errorMessage: "Titular não encontrado." };

  const fileName = file.name.toLowerCase();
  const isXlsx = fileName.endsWith(".xlsx");
  const isPdf = fileName.endsWith(".pdf");

  if (institution === "nomad" && !exchangeRateStr) {
    return { success: false, errorMessage: "Informe a cotação USD/BRL para importar o Nomad." };
  }

  const exchangeRate = exchangeRateStr ? toDecimal(exchangeRateStr.replace(",", ".")) : new Decimal(1);

  const { data: batch, error: batchErr } = await supabase
    .from("import_batches")
    .insert({
      holder_id: holderId,
      institution,
      status: "processing",
      source: isXlsx ? "xlsx" : isPdf ? "pdf" : "csv",
      filename: file.name,
      imported_by: user.id,
      exchange_rate: institution === "nomad" ? exchangeRate.toNumber() : null,
      exchange_rate_date: institution === "nomad" ? (exchangeRateDateStr ?? new Date().toISOString().split("T")[0]) : null,
    })
    .select()
    .single();

  if (batchErr || !batch) {
    return { success: false, errorMessage: `Erro ao criar batch: ${batchErr?.message}` };
  }

  try {
    let positions: ParsedPosition[];
    let errors: Array<{ row: number; field: string; message: string }> = [];

    if (isXlsx) {
      if (institution !== "xp" && institution !== "btg") {
        return { success: false, errorMessage: "Formato XLSX é suportado para XP e BTG. Nomad usa PDF." };
      }
      const buffer = await file.arrayBuffer();

      const ownerErr = validateDocumentOwner(
        institution === "btg" ? extractBTGXlsxOwner(buffer) : extractXPXlsxOwner(buffer),
        holder,
      );
      if (ownerErr) {
        await supabase.from("import_batches").update({ status: "failed", error_message: ownerErr }).eq("id", batch.id);
        return { success: false, errorMessage: ownerErr };
      }

      positions = institution === "btg" ? parseBTGXlsx(buffer) : parseXPXlsx(buffer);
    } else if (isPdf) {
      if (institution !== "nomad") {
        return { success: false, errorMessage: "Formato PDF é suportado apenas para Nomad." };
      }
      const buffer = await file.arrayBuffer();

      const docOwner = await extractNomadPdfOwner(buffer);
      if (!docOwner.name && !docOwner.cpf) {
        const msg = "Não foi possível identificar o titular no documento. Confirme que o arquivo é um extrato Nomad do titular selecionado.";
        await supabase.from("import_batches").update({ status: "failed", error_message: msg }).eq("id", batch.id);
        return { success: false, errorMessage: msg };
      }
      const ownerErr = validateDocumentOwner(docOwner, holder);
      if (ownerErr) {
        await supabase.from("import_batches").update({ status: "failed", error_message: ownerErr }).eq("id", batch.id);
        return { success: false, errorMessage: ownerErr };
      }

      positions = await parseNomadPdf(buffer, exchangeRate);
    } else {
      const csvText = await file.text();
      const format = detectFormat(csvText);
      if (format === "unknown") {
        await supabase.from("import_batches").update({ status: "failed", error_message: "Formato não reconhecido." }).eq("id", batch.id);
        return { success: false, errorMessage: "Formato do arquivo não reconhecido. Verifique se é XP (XLSX), BTG (CSV) ou Nomad (CSV)." };
      }

      const ownerErr = validateDocumentOwner(extractCsvOwner(csvText, format as "xp" | "btg" | "nomad"), holder);
      if (ownerErr) {
        await supabase.from("import_batches").update({ status: "failed", error_message: ownerErr }).eq("id", batch.id);
        return { success: false, errorMessage: ownerErr };
      }

      ({ positions, errors } = parseCSV(csvText, format as "xp" | "btg" | "nomad", exchangeRate));
    }

    if (positions.length === 0) {
      await supabase
        .from("import_batches")
        .update({ status: "failed", error_message: "Nenhuma posição válida encontrada no CSV." })
        .eq("id", batch.id);
      return { success: false, batchId: batch.id, errorMessage: "Nenhuma posição válida encontrada.", errors };
    }

    const rows = positions.map((p) => {
      const marketValueBrl =
        p.currency === "USD" ? p.marketValue.times(exchangeRate) : p.marketValue;
      const costBasis = p.avgPrice && p.quantity ? p.avgPrice.times(p.quantity) : null;
      const pnl = costBasis ? p.marketValue.minus(costBasis) : null;
      const pnlPct = costBasis && costBasis.gt(0) && pnl ? pnl.div(costBasis) : null;

      return {
        batch_id: batch.id,
        holder_id: holderId,
        institution,
        ticker: p.ticker,
        name: p.name,
        asset_class: p.assetClass,
        currency: p.currency,
        quantity: p.quantity.toNumber(),
        avg_price: p.avgPrice?.toNumber() ?? null,
        current_price: p.currentPrice?.toNumber() ?? null,
        market_value: p.marketValue.toNumber(),
        cost_basis: costBasis?.toNumber() ?? null,
        pnl: pnl?.toNumber() ?? null,
        pnl_pct: pnlPct?.toNumber() ?? null,
        exchange_rate: p.currency === "USD" ? exchangeRate.toNumber() : null,
        market_value_brl: marketValueBrl.toNumber(),
        maturity_date: p.maturityDate?.toISOString().split("T")[0] ?? null,
        indexer: p.indexer,
        indexer_rate: p.indexerRate?.toNumber() ?? null,
        liquidity_days: p.liquidityDays,
        quota_value: p.quotaValue?.toNumber() ?? null,
        quota_date: p.quotaDate?.toISOString().split("T")[0] ?? null,
        raw_data: p.rawData,
      };
    });

    const { error: insertErr } = await supabase.from("positions").insert(rows);

    if (insertErr) {
      await supabase
        .from("import_batches")
        .update({ status: "failed", error_message: insertErr.message })
        .eq("id", batch.id);
      return { success: false, batchId: batch.id, errorMessage: `Erro ao salvar posições: ${insertErr.message}` };
    }

    await supabase
      .from("import_batches")
      .update({ status: "completed", row_count: positions.length, completed_at: new Date().toISOString() })
      .eq("id", batch.id);

    revalidatePath("/dashboard");
    revalidatePath("/holders");

    return { success: true, batchId: batch.id, rowCount: positions.length, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro inesperado";
    await supabase
      .from("import_batches")
      .update({ status: "failed", error_message: msg })
      .eq("id", batch.id);
    return { success: false, batchId: batch.id, errorMessage: msg };
  }
}
