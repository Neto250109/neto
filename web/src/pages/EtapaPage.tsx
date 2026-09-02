import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno } from "../lib/useEtapaRows";
import type { EtapaSlug, Rede } from "../types";
import { SLUG_ETAPA, REDES } from "../types";
import KpiCard from "../components/KpiCard";
import LineSeriesChart from "../components/charts/LineSeriesChart";
import BarRankChart from "../components/charts/BarRankChart";
import HistogramChart from "../components/charts/HistogramChart";
import MapView, { type MapDatum } from "../components/MapView";
import DataTable from "../components/DataTable";
import { fmtInt, fmtNum } from "../lib/format";
import { catColor } from "../lib/colors";

export default function EtapaPage() {
  const { slug } = useParams<{ slug: EtapaSlug }>();
  const etapa = SLUG_ETAPA[slug as EtapaSlug] ?? "Anos Iniciais";
  const { meta, seriesAgregadas } = useDataStore();
  const [rede, setRede] = useState<Rede>("Pública");
  const navigate = useNavigate();
  const { rows, loading } = useEtapaRows(etapa);
  const anos = meta?.etapas[etapa]?.anos ?? [];

  const redeRows = useMemo(() => rows.filter((r) => r.rede === rede), [rows, rede]);
  const valores2025 = redeRows.map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null);
  const media = valores2025.length ? valores2025.reduce((a, b) => a + b, 0) / valores2025.length : null;

  const seriesRedes = REDES.map((r) => {
    const node = seriesAgregadas?.Brasil?.[etapa]?.ideb?.[r];
    return { name: r, data: anos.map((a) => node?.[String(a)]?.media ?? null) };
  });

  const top10 = [...redeRows]
    .map((r) => ({ r, v: valorNoAno(r, "ideb", 2025) }))
    .filter((x): x is { r: (typeof redeRows)[number]; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v)
    .slice(0, 10);

  const mapData = useMemo(() => {
    const m = new Map<string, MapDatum>();
    for (const r of redeRows) {
      const v = valorNoAno(r, "ideb", 2025);
      m.set(r.codigo, { codigo: r.codigo, valor: v, tooltip: `<b>${r.nome} — ${r.uf}</b><br/>IDEB 2025: ${v !== null ? fmtNum(v, 1) : "ND"}` });
    }
    return m;
  }, [redeRows]);

  return (
    <div>
      <h1 className="page-title">{etapa}</h1>
      <p className="page-subtitle">
        {meta?.etapas[etapa] && `Série histórica de ${meta.etapas[etapa].primeiro_ano} a ${meta.etapas[etapa].ultimo_ano}.`} Fonte: INEP/MEC — Divulgação IDEB 2025.
      </p>

      <div className="card" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <span className="pill-label">Rede:</span>
        {REDES.map((r) => (
          <button key={r} className="btn" onClick={() => setRede(r)} style={{ background: rede === r ? "var(--brand)" : undefined, color: rede === r ? "#fff" : undefined }}>
            {r}
          </button>
        ))}
        {loading && <span className="muted" style={{ marginLeft: 8 }}>carregando…</span>}
      </div>

      <div className="grid kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label={`IDEB 2025 (${rede})`} value={fmtNum(media, 3)} accent="var(--brand)" />
        <KpiCard label="Municípios avaliados" value={fmtInt(valores2025.length)} sub={`de ${fmtInt(redeRows.length)}`} />
        <KpiCard label="Referência oficial 2025" value={fmtNum(meta?.valores_referencia_nacional_2025[etapa] ?? null, 3)} sub="valor nacional divulgado (INEP)" />
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Evolução por rede — {etapa}</h3>
          <LineSeriesChart categorias={anos} series={seriesRedes} />
        </div>
        <div className="card">
          <h3>Top 10 municípios — {etapa} ({rede})</h3>
          <BarRankChart categorias={top10.map((t) => `${t.r.nome} (${t.r.uf})`).reverse()} valores={top10.map((t) => t.v).reverse()} colorFn={(_, i) => catColor(i % 8)} />
        </div>
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Mapa — {etapa} ({rede}) 2025</h3>
          <MapView dados={mapData} onClickMunicipio={(cod) => navigate(`/municipio/${cod}`)} />
        </div>
        <div className="card">
          <h3>Distribuição — {etapa} ({rede}) 2025</h3>
          <HistogramChart values={valores2025} />
        </div>
      </div>

      <div className="card">
        <h3>Ranking — Top 10</h3>
        <DataTable
          columns={[
            { key: "nome", label: "Município", render: (r) => r.r.nome },
            { key: "uf", label: "UF", render: (r) => r.r.uf, width: 60 },
            { key: "ideb", label: "IDEB 2025", align: "right", render: (r) => fmtNum(r.v, 1), value: (r) => r.v },
          ]}
          rows={top10}
          onRowClick={(r) => navigate(`/municipio/${r.r.codigo}`)}
          pageSize={10}
        />
      </div>
    </div>
  );
}
