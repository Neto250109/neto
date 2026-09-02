import type { ReactNode } from "react";

export default function KpiCard({
  label,
  value,
  sub,
  delta,
  deltaGood,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: string | null;
  deltaGood?: boolean | null;
  accent?: string;
}) {
  return (
    <div className="card" style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div className="muted" style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>
        {label}
      </div>
      <div className="tabular" style={{ fontSize: 28, fontWeight: 700, margin: "4px 0 2px", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", minHeight: 16 }}>
        {delta && (
          <span
            className="tabular"
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: deltaGood === null || deltaGood === undefined ? "var(--text-secondary)" : deltaGood ? "var(--success-text)" : "var(--status-critical)",
            }}
          >
            {delta}
          </span>
        )}
        {sub && (
          <span className="muted" style={{ fontSize: 12 }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
