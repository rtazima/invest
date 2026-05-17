"use server";

import { revalidatePath } from "next/cache";
import { markAlertRead, dismissAlert } from "@/lib/data/alerts";

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
