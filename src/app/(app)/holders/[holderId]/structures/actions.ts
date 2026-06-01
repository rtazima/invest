"use server";

import { revalidatePath } from "next/cache";
import { upsertStructure, upsertLegs, deleteStructure } from "@/lib/data/structures";
import type { StructureInput, StructureLegInput } from "@/lib/data/structures";

export async function saveStructureAction(
  holderId: string,
  input: StructureInput,
  legs: StructureLegInput[],
  structureId?: string,
): Promise<{ structureId: string }> {
  const structure = await upsertStructure(holderId, input, structureId);
  await upsertLegs(structure.id, legs);

  revalidatePath(`/holders/${holderId}/structures`);
  revalidatePath("/dashboard");
  return { structureId: structure.id };
}

export async function deleteStructureAction(
  holderId: string,
  structureId: string,
): Promise<void> {
  await deleteStructure(structureId);
  revalidatePath(`/holders/${holderId}/structures`);
  revalidatePath("/dashboard");
}
