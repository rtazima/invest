import { createServerClient } from "@/lib/supabase/server";
import type { DBPositionStructure, DBPositionStructureLeg } from "@/types/database";

export type StructureType = DBPositionStructure["type"];
export type StructureStatus = DBPositionStructure["status"];
export type LegRole = DBPositionStructureLeg["role"];

export interface PositionStructureRef {
  id: string;
  name: string;
  type: StructureType;
  role: LegRole;
}

export type StructureByTickerMap = Map<string, PositionStructureRef[]>;

export interface StructureLegInput {
  role: LegRole;
  ticker: string | null;
  asset_class: string | null;
  strike: number | null;
  expiration_date: string | null;
  contracts: number | null;
  premium: number | null;
  sort_order: number;
}

export interface StructureInput {
  name: string;
  type: StructureType;
  status: StructureStatus;
  notes: string | null;
}

export interface StructureWithLegs extends DBPositionStructure {
  legs: DBPositionStructureLeg[];
  premiumTotal: number;
  nearestExpiry: string | null;
}

export async function getStructures(holderId: string): Promise<StructureWithLegs[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("position_structures")
    .select("*, legs:position_structure_legs(*)")
    .eq("holder_id", holderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getStructures: ${error.message}`);

  return (data ?? []).map((s) => {
    const legs = (s.legs ?? []) as DBPositionStructureLeg[];
    const optionLegs = legs.filter((l) => l.role !== "underlying");
    const premiumTotal = optionLegs.reduce(
      (sum, l) => sum + ((l.premium ?? 0) * (l.contracts ?? 1)),
      0,
    );
    const expiryDates = optionLegs
      .map((l) => l.expiration_date)
      .filter((d): d is string => !!d)
      .sort();
    return {
      ...s,
      legs,
      premiumTotal,
      nearestExpiry: expiryDates[0] ?? null,
    };
  });
}

export async function getStructuresForPositions(holderId: string): Promise<StructureByTickerMap> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("position_structures")
    .select("id, name, type, legs:position_structure_legs(role, ticker)")
    .eq("holder_id", holderId)
    .eq("status", "active");

  if (error) throw new Error(`getStructuresForPositions: ${error.message}`);

  const map: StructureByTickerMap = new Map();
  for (const s of data ?? []) {
    for (const leg of (s.legs ?? []) as Array<{ role: string; ticker: string | null }>) {
      if (!leg.ticker) continue;
      const key = `${holderId}:${leg.ticker.toUpperCase()}`;
      const ref: PositionStructureRef = {
        id: s.id,
        name: s.name,
        type: s.type as StructureType,
        role: leg.role as LegRole,
      };
      const existing = map.get(key) ?? [];
      existing.push(ref);
      map.set(key, existing);
    }
  }
  return map;
}

export async function getStructuresForAllHolders(): Promise<StructureByTickerMap> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("position_structures")
    .select("id, name, type, holder_id, legs:position_structure_legs(role, ticker)")
    .eq("status", "active");

  if (error) throw new Error(`getStructuresForAllHolders: ${error.message}`);

  const map: StructureByTickerMap = new Map();
  for (const s of data ?? []) {
    for (const leg of (s.legs ?? []) as Array<{ role: string; ticker: string | null }>) {
      if (!leg.ticker) continue;
      const key = `${s.holder_id}:${leg.ticker.toUpperCase()}`;
      const ref: PositionStructureRef = {
        id: s.id,
        name: s.name,
        type: s.type as StructureType,
        role: leg.role as LegRole,
      };
      const existing = map.get(key) ?? [];
      existing.push(ref);
      map.set(key, existing);
    }
  }
  return map;
}

export async function getStructure(structureId: string): Promise<StructureWithLegs | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("position_structures")
    .select("*, legs:position_structure_legs(*)")
    .eq("id", structureId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getStructure: ${error.message}`);

  const legs = (data.legs ?? []) as DBPositionStructureLeg[];
  const optionLegs = legs.filter((l) => l.role !== "underlying");
  const premiumTotal = optionLegs.reduce(
    (sum, l) => sum + ((l.premium ?? 0) * (l.contracts ?? 1)),
    0,
  );
  const expiryDates = optionLegs
    .map((l) => l.expiration_date)
    .filter((d): d is string => !!d)
    .sort();

  return { ...data, legs, premiumTotal, nearestExpiry: expiryDates[0] ?? null };
}

export async function upsertStructure(
  holderId: string,
  input: StructureInput,
  structureId?: string,
): Promise<DBPositionStructure> {
  const supabase = await createServerClient();

  const payload = { ...input, holder_id: holderId, updated_at: new Date().toISOString() };

  if (structureId) {
    const { data, error } = await supabase
      .from("position_structures")
      .update(payload)
      .eq("id", structureId)
      .select()
      .single();
    if (error) throw new Error(`upsertStructure (update): ${error.message}`);
    return data;
  }

  const { data, error } = await supabase
    .from("position_structures")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(`upsertStructure (insert): ${error.message}`);
  return data;
}

export async function upsertLegs(structureId: string, legs: StructureLegInput[]): Promise<void> {
  const supabase = await createServerClient();

  const { error: delErr } = await supabase
    .from("position_structure_legs")
    .delete()
    .eq("structure_id", structureId);

  if (delErr) throw new Error(`upsertLegs (delete): ${delErr.message}`);
  if (legs.length === 0) return;

  const { error: insErr } = await supabase
    .from("position_structure_legs")
    .insert(legs.map((l) => ({ ...l, structure_id: structureId })));

  if (insErr) throw new Error(`upsertLegs (insert): ${insErr.message}`);
}

export async function deleteStructure(structureId: string): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("position_structures")
    .delete()
    .eq("id", structureId);
  if (error) throw new Error(`deleteStructure: ${error.message}`);
}
