"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { detectFormat, parseCSV } from "@/lib/csv";
import { toDecimal } from "@/lib/decimal";
import Decimal from "decimal.js";
import type { Enums } from "@/types/database";

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

  const csvText = await file.text();
  const format = detectFormat(csvText);

  if (format === "unknown") {
    return { success: false, errorMessage: "Formato do CSV não reconhecido. Verifique se é um arquivo XP, BTG ou Nomad." };
  }

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
      source: "csv",
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
    const { positions, errors } = parseCSV(csvText, format as "xp" | "btg" | "nomad", exchangeRate);

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
