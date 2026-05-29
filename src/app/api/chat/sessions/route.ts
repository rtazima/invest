import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Response("Não autorizado", { status: 401 });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select(`
      id, title, scope_type, scope_holder_id, created_at, updated_at,
      chat_messages (role, content, created_at)
    `)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) return new Response(error.message, { status: 500 });

  const sessions = (data ?? []).map((s) => {
    const msgs = (s.chat_messages ?? []) as { role: string; content: string; created_at: string }[];
    const last = msgs.sort((a, b) => a.created_at.localeCompare(b.created_at)).at(-1);
    return {
      id: s.id,
      title: s.title,
      scope_type: s.scope_type,
      scope_holder_id: s.scope_holder_id,
      updated_at: s.updated_at,
      preview: last?.content.slice(0, 80) ?? "",
      message_count: msgs.length,
    };
  });

  return Response.json(sessions);
}
