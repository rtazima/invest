"use server";

import { updatePositionAssetClass, saveArchetypeForTicker } from "@/lib/data/positions";
import type { Enums } from "@/types/database";

export async function updatePositionAssetClassAction(
  positionId: string,
  assetClass: Enums<"asset_class">,
): Promise<string | null> {
  try {
    await updatePositionAssetClass(positionId, assetClass);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Erro desconhecido";
  }
}

export async function updateArchetypeAction(
  ticker: string,
  archetype: string,
  subsegment: string | null,
  assetClass: string,
): Promise<string | null> {
  try {
    await saveArchetypeForTicker(ticker, archetype, subsegment, assetClass);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Erro desconhecido";
  }
}
