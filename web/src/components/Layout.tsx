import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useDataStore } from "../lib/dataStore";

const NAV_GROUPS: { title: string; items: { to: string; label: string }[] }[] = [
  { title: "", items: [{ to: "/", label: "Visão Geral" }] },
  {
    title: "Territorial",
    items: [
      { to: "/brasil", label: "Brasil" },
      { to: "/territorio/regioes", label: "Regiões" },
      { to: "/territorio/estados", label: "Estados" },
      { to: "/territorio/regiao/Nordeste", label: "Nordeste" },
      { to: "/territorio/uf/RN", label: "Rio Grande do Norte" },
      { to: "/municipios", label: "Municípios" },
    ],
  },
  {
    title: "Etapas de ensino",
    items: [
      { to: "/etapa/anos_iniciais", label: "Anos Iniciais" },
      { to: "/etapa/anos_finais", label: "Anos Finais" },
      { to: "/etapa/ensino_medio", label: "Ensino Médio" },
    ],
  },
  {
    title: "Análises temáticas",
    items: [
      { to: "/redes", label: "Redes de Ensino" },
      { to: "/ideb-meta", label: "IDEB × Meta" },
      { to: "/evolucao", label: "Evolução" },
      { to: "/ranking", label: "Ranking" },
      { to: "/mapa", label: "Mapas" },
      { to: "/distribuicao", label: "Distribuição Estatística" },
      { to: "/decomposicao", label: "Decomposição do IDEB" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { to: "/qualidade", label: "Qualidade dos Dados" },
      { to: "/metodologia", label: "Metodologia" },
    ],
  },
];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => (localStorage.getItem("ideb-theme") as never) || "system");
  useEffect(() => {
    if (theme === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ideb-theme", theme);
  }, [theme]);
  return { theme, setTheme };
}

export default function Layout() {
  const { init, meta, ready, error } = useDataStore();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div style={{ display: "flex", minHeight: "100%" }}>
      <aside
        style={{
          width: collapsed ? 60 : "var(--sidebar-w)",
          flexShrink: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
          transition: "width .15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#2a78d6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>
            I
          </div>
          {!collapsed && (
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>IDEB 2025</div>
              <div className="muted" style={{ fontSize: 11 }}>
                Painel Nacional
              </div>
            </div>
          )}
          <button
            className="btn"
            onClick={() => setCollapsed((c) => !c)}
            style={{ marginLeft: "auto", padding: "4px 8px" }}
            title="Recolher menu"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>
        <nav style={{ padding: "10px 8px" }}>
          {NAV_GROUPS.map((g, gi) => (
            <div key={gi} style={{ marginBottom: 10 }}>
              {g.title && !collapsed && (
                <div className="muted" style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 10px 2px" }}>
                  {g.title}
                </div>
              )}
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    display: "block",
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 13.2,
                    fontWeight: isActive ? 650 : 500,
                    color: isActive ? "#2a78d6" : "var(--text-primary)",
                    background: isActive ? "color-mix(in srgb, #2a78d6 12%, transparent)" : "transparent",
                    marginBottom: 1,
                    whiteSpace: collapsed ? "nowrap" : "normal",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  })}
                >
                  {collapsed ? item.label.slice(0, 2) : item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            height: "var(--topbar-h)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <div className="secondary" style={{ fontSize: 12.5 }}>
            {error ? (
              <span style={{ color: "var(--status-critical)" }}>Erro ao carregar dados: {error}</span>
            ) : ready ? (
              <span>
                Fonte: INEP/MEC — Divulgação IDEB 2025 · {meta?.total_municipios.toLocaleString("pt-BR")} municípios · gerado em{" "}
                {meta ? new Date(meta.gerado_em).toLocaleDateString("pt-BR") : ""}
              </span>
            ) : (
              <span>Carregando base de dados…</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["light", "system", "dark"] as const).map((t) => (
              <button key={t} className="btn" onClick={() => setTheme(t)} style={{ opacity: theme === t ? 1 : 0.55, padding: "5px 9px" }}>
                {t === "light" ? "☀" : t === "dark" ? "☾" : "⚙"}
              </button>
            ))}
          </div>
        </header>
        <main style={{ padding: 24, maxWidth: 1440, margin: "0 auto" }}>
          {ready ? <Outlet /> : <div className="muted">Carregando…</div>}
        </main>
      </div>
    </div>
  );
}
