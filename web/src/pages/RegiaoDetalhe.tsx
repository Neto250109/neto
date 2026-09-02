import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import { describe } from "../lib/stats";
import { fmtDelta, fmtInt, fmtNum, fmtPct } from "../lib/format";
import DataTable from "../components/DataTable";
import LineSeriesChart from "../components/charts/LineSeriesChart";
import MapView, { type MapDatum } from "../components/MapView";
import KpiCard from "../components/KpiCard";

export default function RegiaoDetalhe() {
  const { regiao } = useParams<{ regiao: string }>();
  const navigate = useNavigate();
  const { meta, seriesAgregadas } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const { rows, loading } = useEtapaRows(etapa);
  const anos = meta?.etapas[etapa]?.anos ?? [];

  const rs = useMemo(() => rows.filter((r) => r.rede === rede && r.regiao === regiao), [rows, rede, regiao]);
  const v2025 = rs.map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null);
  const stats = describe(v2025);
  const metaCmp = rs
    .map((r) => {
      const um = ultimoDisponivel(r, "meta");
      if (!um) return null;
      const obs = valorNoAno(r, "ideb", um.ano);
      return obs !== null ? obs - um.valor : null;
    })
    .filter((v): v is number => v !== null);
  const acima = metaCmp.filter((v) => v >= 0).length;

  const ufsDaRegiao = meta?.ufs.filter((u) => u.regiao === regiao) ?? [];
  const porUf = ufsDaRegiao.map((u) => {
    const rsUf = rs.filter((r) => r.uf === u.uf);
    const vals = rsUf.map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null);
    return { uf: u.uf, uf_nome: u.uf_nome, stats: describe(vals) };
  });

  const serieRegiao = { name: regiao ?? "", data: anos.map((a) => seriesAgregadas?.Regiao?.[etapa]?.ideb?.[regiao ?? ""]?.[rede]?.[String(a)]?.media ?? null) };

  const mapData = useMemo(() => {
    const m = new Map<string, MapDatum>();
    for (const r of rs) {
      const v = valorNoAno(r, "ideb", 2025);
      m.set(r.codigo, { codigo: r.codigo, valor: v, tooltip: `<b>${r.nome} — ${r.uf}</b><br/>IDEB 2025: ${v !== null ? fmtNum(v, 1) : "ND"}` });
    }
    return m;
  }, [rs]);

  return (
    <div>
      <h1 className="page-title">IDEB — Região {regiao}</h1>
      <p className="page-subtitle">Detalhamento estadual e municipal da região {regiao}.</p>

      <div className="card" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa)}>
          {ETAPAS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select value={rede} onChange={(e) => setRede(e.target.value as Rede)}>
          {REDES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {loading && <span className="muted">carregando…</span>}
      </div>

      <div className="grid kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="IDEB médio regional" value={fmtNum(stats.media, 3)} accent="var(--brand)" />
        <KpiCard label="Mediana" value={fmtNum(stats.mediana, 3)} />
        <KpiCard label="Municípios avaliados" value={fmtInt(stats.n)} />
        <KpiCard label="Acima da meta" value={metaCmp.length ? fmtPct((acima / metaCmp.length) * 100, 1) : "ND"} />
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Evolução histórica — {regiao}</h3>
          <LineSeriesChart categorias={anos} series={[serieRegiao]} />
        </div>
        <div className="card">
          <h3>Mapa — {regiao}</h3>
          <MapView dados={mapData} onClickMunicipio={(cod) => navigate(`/municipio/${cod}`)} ufFilter={regiao} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Ranking estadual dentro da região</h3>
        <DataTable
          columns={[
            { key: "uf", label: "UF", render: (r) => <Link to={`/territorio/uf/${r.uf}`}>{r.uf}</Link>, width: 60 },
            { key: "uf_nome", label: "Estado" },
            { key: "n", label: "Municípios", align: "right", value: (r) => r.stats.n, render: (r) => fmtInt(r.stats.n) },
            { key: "media", label: "IDEB médio", align: "right", value: (r) => r.stats.media, render: (r) => fmtNum(r.stats.media, 3) },
          ]}
          rows={porUf}
          defaultSortKey="media"
          pageSize={ufsDaRegiao.length || 10}
        />
      </div>

      <div className="card">
        <h3>Detalhamento municipal</h3>
        <DataTable
          columns={[
            { key: "nome", label: "Município" },
            { key: "uf", label: "UF", width: 56 },
            { key: "ideb", label: "IDEB 2025", align: "right", value: (r) => valorNoAno(r, "ideb", 2025), render: (r) => fmtNum(valorNoAno(r, "ideb", 2025), 1) },
            { key: "delta", label: "Δ 2023→2025", align: "right", value: (r) => (valorNoAno(r, "ideb", 2025) ?? 0) - (valorNoAno(r, "ideb", 2023) ?? 0), render: (r) => fmtDelta((valorNoAno(r, "ideb", 2025) ?? NaN) - (valorNoAno(r, "ideb", 2023) ?? NaN), 2) },
          ]}
          rows={rs}
          defaultSortKey="ideb"
          pageSize={20}
          onRowClick={(r) => navigate(`/municipio/${r.codigo}`)}
          exportFilename={`regiao_${regiao}_${etapa}_${rede}`}
        />
      </div>
    </div>
  );
}
