"use server";

import { updatePositionAssetClass } from "@/lib/data/positions";
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
