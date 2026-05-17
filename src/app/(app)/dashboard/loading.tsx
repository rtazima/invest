export default function DashboardLoading() {
  return (
    <div style={{ display: "flex", gap: "0", position: "relative" }}>
      <div style={{ flex: 1, marginRight: "256px" }}>
        {/* Hero skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <Skeleton style={{ gridColumn: "span 7", height: "280px" }} />
          <div
            style={{
              gridColumn: "span 5",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} style={{ height: "130px" }} />
            ))}
          </div>
        </div>

        {/* Table skeleton */}
        <Skeleton style={{ height: "400px" }} />
      </div>

      {/* Alerts panel skeleton */}
      <div
        style={{
          position: "fixed",
          right: 0,
          top: "48px",
          bottom: 0,
          width: "256px",
          borderLeft: "1px solid var(--color-line-2)",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <div className="hairline" style={{ padding: "16px" }}>
          <Skeleton style={{ height: "16px", width: "60px" }} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ margin: "12px", height: "64px" }} />
        ))}
      </div>
    </div>
  );
}

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        borderRadius: "8px",
        backgroundColor: "var(--color-bg-2)",
        border: "1px solid var(--color-line-2)",
        animation: "pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}
