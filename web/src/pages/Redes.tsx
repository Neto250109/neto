import { useMemo, useState } from "react";
import { useEtapaRows, valorNoAno } from "../lib/useEtapaRows";
import { useDataStore } from "../lib/dataStore";
import type { Etapa } from "../types";
import { ETAPAS, REDES } from "../types";
import LineSeriesChart from "../components/charts/LineSeriesChart";
import BoxplotChart from "../components/charts/BoxplotChart";
import DataTable from "../components/DataTable";
import { describe } from "../lib/stats";
import { fmtInt, fmtNum } from "../lib/format";
import { catColor } from "../lib/colors";

export default function Redes() {
  const { meta, seriesAgregadas } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [regiao, setRegiao] = useState("");
  const [uf, setUf] = useState("");
  const { rows, loading } = useEtapaRows(etapa);
  const anos = meta?.etapas[etapa]?.anos ?? [];

  const filtradas = useMemo(() => rows.filter((r) => (!regiao || r.regiao === regiao) && (!uf || r.uf === uf)), [rows, regiao, uf]);

  const porRede = REDES.map((rede) => {
    const rs = filtradas.filter((r) => r.rede === rede);
    const valores2025 = rs.map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null);
    const stats = describe(valores2025);
    return { rede, rs, valores2025, stats };
  });

  const seriesLinha = REDES.map((rede) => {
    let node;
    if (uf) node = seriesAgregadas?.UF?.[etapa]?.ideb?.[uf]?.[rede];
    else if (regiao) node = seriesAgregadas?.Regiao?.[etapa]?.ideb?.[regiao]?.[rede];
    else node = seriesAgregadas?.Brasil?.[etapa]?.ideb?.[rede];
    return { name: rede, data: anos.map((a) => node?.[String(a)]?.media ?? null) };
  });

  return (
    <div>
      <h1 className="page-title">Análise das Redes de Ensino</h1>
      <p className="page-subtitle">
        Comparação entre as redes Municipal, Estadual, Federal e Pública. A rede <b>Pública</b> é o agregado das redes públicas correspondentes e não deve ser somada às demais em totais.
      </p>

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={etapa} onChange={(e) => setEtapa(e.target.value as Etapa)}>
          {ETAPAS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select
          value={regiao}
          onChange={(e) => {
            setRegiao(e.target.value);
            setUf("");
          }}
        >
          <option value="">Todas as regiões</option>
          {meta?.regioes.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">Todas as UFs</option>
          {meta?.ufs.filter((u) => !regiao || u.regiao === regiao).map((u) => (
            <option key={u.uf} value={u.uf}>
              {u.uf}
            </option>
          ))}
        </select>
        {loading && <span className="muted">carregando…</span>}
      </div>

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        {porRede.map((p, i) => (
          <div key={p.rede} className="card" style={{ borderTop: `3px solid ${catColor(i)}` }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{p.rede}</div>
            <div className="tabular" style={{ fontSize: 26, fontWeight: 700, margin: "4px 0 2px" }}>
              {fmtNum(p.stats.media, 2)}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {fmtInt(p.stats.n)} município(s) avaliado(s) em 2025
            </div>
          </div>
        ))}
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Evolução do IDEB por rede</h3>
          <LineSeriesChart categorias={anos} series={seriesLinha} />
        </div>
        <div className="card">
          <h3>Distribuição do IDEB 2025 por rede</h3>
          <BoxplotChart grupos={porRede.map((p) => ({ nome: p.rede, valores: p.valores2025 }))} />
        </div>
      </div>

      <div className="card">
        <h3>Desempenho médio por rede — detalhes estatísticos</h3>
        <DataTable
          columns={[
            { key: "rede", label: "Rede" },
            { key: "n", label: "Municípios avaliados", align: "right", value: (r) => r.stats.n, render: (r) => fmtInt(r.stats.n) },
            { key: "media", label: "Média", align: "right", value: (r) => r.stats.media, render: (r) => fmtNum(r.stats.media, 3) },
            { key: "mediana", label: "Mediana", align: "right", value: (r) => r.stats.mediana, render: (r) => fmtNum(r.stats.mediana, 3) },
            { key: "min", label: "Mínimo", align: "right", value: (r) => r.stats.min, render: (r) => fmtNum(r.stats.min, 2) },
            { key: "max", label: "Máximo", align: "right", value: (r) => r.stats.max, render: (r) => fmtNum(r.stats.max, 2) },
            { key: "dp", label: "Desvio-padrão", align: "right", value: (r) => r.stats.desvioPadrao, render: (r) => fmtNum(r.stats.desvioPadrao, 3) },
          ]}
          rows={porRede}
          defaultSortKey="media"
          pageSize={4}
        />
      </div>
    </div>
  );
}
