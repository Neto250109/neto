import { Link } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { ETAPAS, REDES } from "../types";
import DataTable from "../components/DataTable";
import LineSeriesChart from "../components/charts/LineSeriesChart";
import BarRankChart from "../components/charts/BarRankChart";
import { fmtDelta, fmtInt, fmtNum } from "../lib/format";
import { catColor } from "../lib/colors";

export default function Brasil() {
  const { meta, seriesAgregadas } = useDataStore();
  if (!meta || !seriesAgregadas) return <p className="muted">Carregando…</p>;

  const anosTodos = Array.from(new Set(ETAPAS.flatMap((e) => meta.etapas[e].anos))).sort((a, b) => a - b);

  const porEtapa = ETAPAS.map((e) => {
    const v25 = seriesAgregadas.Brasil[e]?.ideb?.["Pública"]?.["2025"];
    const v23 = seriesAgregadas.Brasil[e]?.ideb?.["Pública"]?.["2023"];
    const delta = v25?.media !== undefined && v23?.media !== undefined && v25.media !== null && v23.media !== null ? v25.media - v23.media : null;
    return { etapa: e, v2023: v23?.media ?? null, v2025: v25?.media ?? null, n: v25?.n ?? 0, delta };
  });

  const seriesEtapa = ETAPAS.map((e) => ({
    name: e,
    data: anosTodos.map((a) => seriesAgregadas.Brasil[e]?.ideb?.["Pública"]?.[String(a)]?.media ?? null),
  }));

  const porRede = REDES.map((r) => ({
    rede: r,
    porEtapa: ETAPAS.map((e) => seriesAgregadas.Brasil[e]?.ideb?.[r]?.["2025"]?.media ?? null),
  }));

  return (
    <div>
      <h1 className="page-title">Brasil</h1>
      <p className="page-subtitle">Panorama nacional do IDEB 2025, comparando etapas de ensino e redes — rede Pública como referência agregada.</p>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Evolução histórica por etapa (rede Pública)</h3>
          <LineSeriesChart categorias={anosTodos} series={seriesEtapa} />
        </div>
        <div className="card">
          <h3>IDEB 2025 por rede e etapa</h3>
          <BarRankChart
            categorias={porRede.flatMap((r) => ETAPAS.map((e) => `${r.rede} · ${e}`))}
            valores={porRede.flatMap((r) => r.porEtapa)}
            colorFn={(_, i) => catColor(Math.floor(i / 3))}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Análise por etapa — IDEB 2023 × 2025 (rede Pública)</h3>
        <DataTable
          columns={[
            { key: "etapa", label: "Etapa" },
            { key: "v2023", label: "IDEB 2023", align: "right", value: (r) => r.v2023, render: (r) => fmtNum(r.v2023, 3) },
            { key: "v2025", label: "IDEB 2025", align: "right", value: (r) => r.v2025, render: (r) => fmtNum(r.v2025, 3) },
            { key: "delta", label: "Variação", align: "right", value: (r) => r.delta, render: (r) => fmtDelta(r.delta, 3) },
            { key: "n", label: "Municípios avaliados 2025", align: "right", value: (r) => r.n, render: (r) => fmtInt(r.n) },
          ]}
          rows={porEtapa}
          pageSize={3}
        />
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          A diferença entre etapas reflete a queda esperada de desempenho ao longo da trajetória escolar (Anos Iniciais → Anos Finais → Ensino Médio), padrão observado historicamente pelo INEP.
          Veja a <Link to="/decomposicao">decomposição do IDEB</Link> para entender se essa diferença vem do rendimento ou do desempenho no SAEB.
        </p>
      </div>

      <div className="card">
        <h3>Ver mais</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" to="/redes">Análise das Redes de Ensino</Link>
          <Link className="btn" to="/distribuicao">Distribuição Estatística</Link>
          <Link className="btn" to="/territorio/regioes">Regiões</Link>
          <Link className="btn" to="/territorio/estados">Estados</Link>
          <Link className="btn" to="/mapa">Mapa Nacional</Link>
        </div>
      </div>
    </div>
  );
}
