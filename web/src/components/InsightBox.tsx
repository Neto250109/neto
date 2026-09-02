export default function InsightBox({ title = "Insight territorial", texts }: { title?: string; texts: (string | null)[] }) {
  const validos = texts.filter((t): t is string => !!t);
  if (!validos.length) return null;
  return (
    <div
      className="card"
      style={{
        borderLeft: "3px solid #2a78d6",
        background: "color-mix(in srgb, #2a78d6 6%, var(--surface))",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 15 }}>💡</span>
        <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".03em", color: "#2a78d6" }}>{title}</h4>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {validos.map((t, i) => (
          <p key={i} style={{ fontSize: 13.5, lineHeight: 1.55 }}>
            {t}
          </p>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 10.5, marginTop: 8 }}>
        Indicadores calculados pelo BI a partir dos dados filtrados — não substituem o dado original do INEP.
      </p>
    </div>
  );
}
