"use server";

import { revalidatePath } from "next/cache";
import { markAlertRead, dismissAlert } from "@/lib/data/alerts";
import { createMute } from "@/lib/data/alert-mutes";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function markReadAction(id: string) {
  await markAlertRead(id);
  revalidateAll();
}

export async function dismissAction(id: string) {
  await dismissAlert(id);
  revalidateAll();
}

export async function snoozeAction(
  ticker: string | null,
  alertType: string | null,
  days: number | null,
) {
  await createMute(ticker, alertType, days);
  revalidateAll();
}

export async function bulkMarkReadAction(ids: string[]) {
  await Promise.all(ids.map((id) => markAlertRead(id)));
  revalidateAll();
}

export async function bulkDismissAction(ids: string[]) {
  await Promise.all(ids.map((id) => dismissAlert(id)));
  revalidateAll();
}

export async function bulkSnoozeAction(
  pairs: Array<{ ticker: string | null; alertType: string }>,
  days: number,
) {
  const seen = new Set<string>();
  const unique = pairs.filter(({ ticker, alertType }) => {
    const key = `${ticker ?? ""}|${alertType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  await Promise.all(unique.map(({ ticker, alertType }) => createMute(ticker, alertType, days)));
  revalidateAll();
}
