import { Metadata } from "next";
import { getAlerts, countUnreadAlerts } from "@/lib/data/alerts";
import { AlertsList } from "@/components/alerts/AlertsList";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import type { Enums } from "@/types/database";

export const metadata: Metadata = { title: "Alertas — Invest" };

interface Props {
  searchParams: Promise<{ severity?: string; status?: string }>;
}

export default async function AlertsPage({ searchParams }: Props) {
  const params = await searchParams;
  const severity = params.severity as Enums<"alert_severity"> | undefined;
  const status = params.status as Enums<"alert_status"> | undefined;

  const [alerts, unreadCount] = await Promise.all([
    getAlerts({ severity, status, limit: 100 }),
    countUnreadAlerts(),
  ]);

  return (
    <div style={{ maxWidth: "800px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: "0 0 4px",
            }}
          >
            Alertas
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-3)" }}>
            {unreadCount} não lido{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <AlertFilters />
      </div>

      <AlertsList alerts={alerts} />
    </div>
  );
}
