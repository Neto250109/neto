import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import KpiCard from "../components/KpiCard";
import LineSeriesChart from "../components/charts/LineSeriesChart";
import BarRankChart from "../components/charts/BarRankChart";
import HistogramChart from "../components/charts/HistogramChart";
import MapView, { type MapDatum } from "../components/MapView";
import DataTable from "../components/DataTable";
import { fmtDelta, fmtNum, fmtPct, fmtInt } from "../lib/format";
import { catColor } from "../lib/colors";

export default function VisaoGeral() {
  const { meta, seriesAgregadas } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const navigate = useNavigate();
  const { rows, loading } = useEtapaRows(etapa);
  const redeRows = useMemo(() => rows.filter((r) => r.rede === rede), [rows, rede]);

  const ideb2025 = redeRows.map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null);
  const ideb2023 = redeRows.map((r) => valorNoAno(r, "ideb", 2023)).filter((v): v is number => v !== null);
  const mediaAtual = ideb2025.length ? ideb2025.reduce((a, b) => a + b, 0) / ideb2025.length : null;
  const media2023 = ideb2023.length ? ideb2023.reduce((a, b) => a + b, 0) / ideb2023.length : null;
  const deltaAbs = mediaAtual !== null && media2023 !== null ? mediaAtual - media2023 : null;
  const deltaPct = mediaAtual !== null && media2023 !== null && media2023 !== 0 ? (mediaAtual / media2023 - 1) * 100 : null;

  const melhor = redeRows
    .map((r) => ({ r, v: valorNoAno(r, "ideb", 2025) }))
    .filter((x): x is { r: (typeof redeRows)[number]; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v)[0];
  const menor = redeRows
    .map((r) => ({ r, v: valorNoAno(r, "ideb", 2025) }))
    .filter((x): x is { r: (typeof redeRows)[number]; v: number } => x.v !== null)
    .sort((a, b) => a.v - b.v)[0];

  const metaComparacoes = redeRows
    .map((r) => {
      const ult = ultimoDisponivel(r, "meta");
      if (!ult) return null;
      const obs = valorNoAno(r, "ideb", ult.ano);
      if (obs === null) return null;
      return obs - ult.valor;
    })
    .filter((v): v is number => v !== null);
  const acimaMeta = metaComparacoes.filter((d) => d >= 0).length;
  const anoMetaRef = redeRows.map((r) => ultimoDisponivel(r, "meta")?.ano).find((a) => a !== undefined);

  const anosTodos = meta ? Array.from(new Set(ETAPAS.flatMap((e) => meta.etapas[e].anos))).sort((a, b) => a - b) : [];
  const seriesEtapas = ETAPAS.map((e) => {
    const node = seriesAgregadas?.Brasil?.[e]?.ideb?.[rede];
    return {
      name: e,
      data: anosTodos.map((a) => node?.[String(a)]?.media ?? null),
    };
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
      m.set(r.codigo, {
        codigo: r.codigo,
        valor: v,
        tooltip: `<b>${r.nome} — ${r.uf}</b><br/>${etapa} · ${rede}<br/>IDEB 2025: ${v !== null ? fmtNum(v, 1) : "ND"}`,
      });
    }
    return m;
  }, [redeRows, etapa, rede]);

  const cartoesEtapa = ETAPAS.map((e, i) => {
    const v2025 = seriesAgregadas?.Brasil?.[e]?.ideb?.["Pública"]?.["2025"];
    const v2023 = seriesAgregadas?.Brasil?.[e]?.ideb?.["Pública"]?.["2023"];
    const ref = meta?.valores_referencia_nacional_2025[e];
    return { etapa: e, media: v2025?.media ?? null, n: v2025?.n ?? 0, delta: v2025?.media !== undefined && v2023?.media !== undefined && v2025.media !== null && v2023.media !== null ? v2025.media - v2023.media : null, ref, cor: catColor(i) };
  });

  return (
    <div>
      <h1 className="page-title">PAINEL NACIONAL — IDEB 2025</h1>
      <p className="page-subtitle">
        {meta?.fonte} · Fundamental (Anos Iniciais e Finais) e Ensino Médio, todos os municípios brasileiros.
      </p>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
        {cartoesEtapa.map((c) => (
          <div key={c.etapa} className="card" style={{ borderTop: `3px solid ${c.cor}` }}>
            <div style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: ".03em" }}>{c.etapa}</div>
            <div className="tabular" style={{ fontSize: 34, fontWeight: 700, margin: "6px 0 2px" }}>
              {fmtNum(c.media, 3)}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 12.5 }}>
              <span style={{ color: (c.delta ?? 0) >= 0 ? "var(--success-text)" : "var(--status-critical)", fontWeight: 700 }}>
                {fmtDelta(c.delta, 3)} vs 2023
              </span>
              <span className="muted">{fmtInt(c.n)} municípios (rede Pública)</span>
            </div>
            {c.ref && (
              <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                referência oficial de divulgação: {fmtNum(c.ref, 3)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <span className="pill-label">Etapa em foco:</span>
        {ETAPAS.map((e) => (
          <button key={e} className="btn" onClick={() => setEtapa(e)} style={{ background: etapa === e ? "#2a78d6" : undefined, color: etapa === e ? "#fff" : undefined, borderColor: etapa === e ? "#2a78d6" : undefined }}>
            {e}
          </button>
        ))}
        <span className="pill-label" style={{ marginLeft: 12 }}>
          Rede:
        </span>
        {REDES.map((r) => (
          <button key={r} className="btn" onClick={() => setRede(r)} style={{ background: rede === r ? "#2a78d6" : undefined, color: rede === r ? "#fff" : undefined, borderColor: rede === r ? "#2a78d6" : undefined }}>
            {r}
          </button>
        ))}
        {loading && <span className="muted" style={{ fontSize: 12 }}>carregando…</span>}
      </div>

      <div className="grid kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label={`IDEB ${etapa} 2025 (${rede})`} value={fmtNum(mediaAtual, 3)} sub={`${fmtInt(ideb2025.length)} municípios com dado`} accent="#2a78d6" />
        <KpiCard label="Variação 2023 → 2025" value={fmtDelta(deltaAbs, 3)} deltaGood={deltaAbs !== null ? deltaAbs >= 0 : null} sub="pontos IDEB" />
        <KpiCard label="Variação percentual" value={deltaPct !== null ? fmtPct(deltaPct, 2) : "ND"} deltaGood={deltaPct !== null ? deltaPct >= 0 : null} />
        <KpiCard label="Municípios avaliados" value={fmtInt(ideb2025.length)} sub={`de ${fmtInt(redeRows.length)} no total`} />
        <KpiCard label="Melhor IDEB" value={melhor ? fmtNum(melhor.v, 1) : "ND"} sub={melhor ? `${melhor.r.nome} — ${melhor.r.uf}` : ""} accent="var(--status-good)" />
        <KpiCard label="Menor IDEB" value={menor ? fmtNum(menor.v, 1) : "ND"} sub={menor ? `${menor.r.nome} — ${menor.r.uf}` : ""} accent="var(--status-critical)" />
        <KpiCard
          label="Acima da meta"
          value={metaComparacoes.length ? fmtPct((acimaMeta / metaComparacoes.length) * 100, 1) : "ND"}
          sub={`${fmtInt(acimaMeta)} de ${fmtInt(metaComparacoes.length)} (meta ${anoMetaRef ?? "—"})`}
        />
        <KpiCard
          label="Abaixo da meta"
          value={metaComparacoes.length ? fmtPct(((metaComparacoes.length - acimaMeta) / metaComparacoes.length) * 100, 1) : "ND"}
          sub={`${fmtInt(metaComparacoes.length - acimaMeta)} de ${fmtInt(metaComparacoes.length)} (meta ${anoMetaRef ?? "—"})`}
        />
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Evolução histórica — Brasil (rede {rede})</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Média simples entre municípios com dado disponível em cada ano.
          </p>
          <LineSeriesChart categorias={anosTodos} series={seriesEtapas} />
        </div>
        <div className="card">
          <h3>
            Top 10 municípios — IDEB 2025 ({etapa}, {rede})
          </h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Clique numa barra para abrir o perfil municipal.
          </p>
          <BarRankChart
            categorias={top10.map((t) => `${t.r.nome} (${t.r.uf})`).reverse()}
            valores={top10.map((t) => t.v).reverse()}
            yName="IDEB"
          />
        </div>
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>
            Mapa nacional — IDEB 2025 ({etapa}, {rede})
          </h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Clique num município para abrir o perfil municipal.
          </p>
          <MapView dados={mapData} onClickMunicipio={(cod) => navigate(`/municipio/${cod}`)} legendMin={0} legendMax={10} />
        </div>
        <div className="card">
          <h3>Distribuição dos resultados</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Histograma do IDEB 2025 entre os municípios avaliados.
          </p>
          <HistogramChart values={ideb2025} />
        </div>
      </div>

      <div className="card">
        <h3>Ranking resumido — Top 10</h3>
        <DataTable
          columns={[
            { key: "pos", label: "#", render: (r) => r.pos, width: 40 },
            { key: "nome", label: "Município", render: (r) => r.r.nome },
            { key: "uf", label: "UF", render: (r) => r.r.uf, width: 60 },
            { key: "ideb", label: "IDEB 2025", align: "right", render: (r) => fmtNum(r.v, 1), value: (r) => r.v },
          ]}
          rows={top10.map((t, i) => ({ ...t, pos: i + 1 }))}
          onRowClick={(r) => navigate(`/municipio/${r.r.codigo}`)}
          pageSize={10}
        />
      </div>
    </div>
  );
}
