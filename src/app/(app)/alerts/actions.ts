"use server";

import { revalidatePath } from "next/cache";
import { markAlertRead, dismissAlert } from "@/lib/data/alerts";
import { createMute } from "@/lib/data/alert-mutes";

export async function markReadAction(id: string) {
  await markAlertRead(id);
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function dismissAction(id: string) {
  await dismissAlert(id);
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function snoozeAction(
  ticker: string | null,
  alertType: string | null,
  days: number | null,
) {
  await createMute(ticker, alertType, days);
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function bulkMarkReadAction(ids: string[]) {
  await Promise.all(ids.map((id) => markAlertRead(id)));
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function bulkDismissAction(ids: string[]) {
  await Promise.all(ids.map((id) => dismissAlert(id)));
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}

export async function bulkSnoozeAction(
  pairs: Array<{ ticker: string | null; alertType: string }>,
  days: number,
) {
  // Deduplica por (ticker, alertType) antes de criar mutes
  const seen = new Set<string>();
  const unique = pairs.filter(({ ticker, alertType }) => {
    const key = `${ticker ?? ""}|${alertType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  await Promise.all(unique.map(({ ticker, alertType }) => createMute(ticker, alertType, days)));
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
}
