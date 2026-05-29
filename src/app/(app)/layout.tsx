import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHolders } from "@/lib/data/holders";
import { countUnreadAlerts } from "@/lib/data/alerts";
import { getInstitutionSyncStatuses } from "@/lib/data/sync";
import { Sidebar } from "@/components/ui/Sidebar";
import { AppHeader } from "@/components/ui/AppHeader";
import { ChatTrigger } from "@/components/chat/ChatTrigger";
import { PrivacyShell } from "@/components/layout/PrivacyShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [holders, unreadCount, syncStatuses] = await Promise.all([
    getHolders(),
    countUnreadAlerts(),
    getInstitutionSyncStatuses(),
  ]);

  const myHolder = holders.find((h) => h.user_id === user.id);
  const isOwner = myHolder?.role === "owner";

  const userInitials = myHolder?.full_name
    ? myHolder.full_name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : (myHolder?.name?.[0]?.toUpperCase() ?? "?");
  const userName = myHolder?.name ?? "—";

  const { data: family } = await supabase
    .from("families")
    .select("name")
    .single();
  const familyName = family?.name ?? "Família";

  return (
    <PrivacyShell>
      <Sidebar unreadCount={unreadCount} isOwner={isOwner} userInitials={userInitials} userName={userName} />

      <div style={{ marginLeft: "192px", flex: 1, display: "flex", flexDirection: "column" }}>
        <AppHeader familyName={familyName} syncStatuses={syncStatuses} />
        <main style={{ flex: 1, padding: "1.5rem", maxWidth: "1440px" }}>
          {children}
        </main>
      </div>

      <ChatTrigger
        isOwner={isOwner}
        holders={holders.map((h) => ({ id: h.id, name: h.name }))}
        myHolderId={myHolder?.id}
      />
    </PrivacyShell>
  );
}
