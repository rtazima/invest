import { createServerClient } from "@/lib/supabase/server";
import type { DBHolder } from "@/types/database";

export async function getHolders(): Promise<DBHolder[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("holders")
    .select("*")
    .order("name");

  if (error) throw new Error(`getHolders: ${error.message}`);
  return data ?? [];
}

export async function getHolder(id: string): Promise<DBHolder | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("holders")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getHolder: ${error.message}`);
  return data;
}

export async function getHolderBySlug(slug: string): Promise<DBHolder | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("holders")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getHolderBySlug: ${error.message}`);
  return data;
}
