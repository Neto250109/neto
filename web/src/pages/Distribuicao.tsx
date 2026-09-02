import { useMemo, useState } from "react";
import { useEtapaRows, valorNoAno } from "../lib/useEtapaRows";
import { useDataStore } from "../lib/dataStore";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES, REGIOES } from "../types";
import { describe } from "../lib/stats";
import HistogramChart from "../components/charts/HistogramChart";
import BoxplotChart from "../components/charts/BoxplotChart";
import BarRankChart from "../components/charts/BarRankChart";
import DataTable from "../components/DataTable";
import { fmtInt, fmtNum, fmtPct } from "../lib/format";

const FAIXAS: { label: string; min: number; max: number }[] = [
  { label: "< 3,0", min: -Infinity, max: 3 },
  { label: "3,0 – 4,0", min: 3, max: 4 },
  { label: "4,0 – 5,0", min: 4, max: 5 },
  { label: "5,0 – 6,0", min: 5, max: 6 },
  { label: "6,0 – 7,0", min: 6, max: 7 },
  { label: "> 7,0", min: 7, max: Infinity },
];

function contarFaixas(valores: number[]) {
  return FAIXAS.map((f) => ({
    ...f,
    n: valores.filter((v) => v >= f.min && v < f.max).length,
  }));
}

export default function Distribuicao() {
  const { meta } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [agrupar, setAgrupar] = useState<"regiao" | "uf" | "etapa">("regiao");
  const { rows, loading } = useEtapaRows(etapa);

  const redeRows = useMemo(() => rows.filter((r) => r.rede === rede), [rows, rede]);
  const valores = redeRows.map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null);
  const stats = describe(valores);

  const gruposRegiao = REGIOES.map((g) => ({
    nome: g,
    valores: redeRows.filter((r) => r.regiao === g).map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null),
  }));
  const gruposUf = (meta?.ufs ?? []).map((u) => ({
    nome: u.uf,
    valores: redeRows.filter((r) => r.uf === u.uf).map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null),
  }));

  const grupos = agrupar === "uf" ? gruposUf : gruposRegiao;
  const faixas = useMemo(() => contarFaixas(valores), [valores]);

  return (
    <div>
      <h1 className="page-title">Distribuição Estatística</h1>
      <p className="page-subtitle">Análise da distribuição do IDEB 2025 — histograma, boxplot e estatística descritiva, excluindo sempre os municípios sem dado disponível.</p>

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
        <select value={agrupar} onChange={(e) => setAgrupar(e.target.value as never)}>
          <option value="regiao">Agrupar por região</option>
          <option value="uf">Agrupar por UF</option>
        </select>
        {loading && <span className="muted">carregando…</span>}
      </div>

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>N (com dado)</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{fmtInt(stats.n)}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Média</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{fmtNum(stats.media, 3)}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Mediana</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{fmtNum(stats.mediana, 3)}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Desvio-padrão</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{fmtNum(stats.desvioPadrao, 3)}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Q1 / Q3</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>{fmtNum(stats.q1, 2)} / {fmtNum(stats.q3, 2)}</div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12 }}>Mín / Máx (amplitude)</div>
          <div className="tabular" style={{ fontSize: 22, fontWeight: 700 }}>
            {fmtNum(stats.min, 1)} / {fmtNum(stats.max, 1)}
          </div>
          <div className="muted" style={{ fontSize: 11 }}>amplitude {fmtNum(stats.amplitude, 2)}</div>
        </div>
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Histograma — IDEB 2025 ({etapa}, {rede})</h3>
          <HistogramChart values={valores} />
        </div>
        <div className="card">
          <h3>Distribuição dos municípios por faixa de IDEB</h3>
          <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            Permite interpretar a estrutura territorial do desempenho educacional, não apenas o ranking individual.
          </p>
          <BarRankChart categorias={faixas.map((f) => f.label)} valores={faixas.map((f) => f.n)} horizontal={false} valueFmt={(v) => `${v} município(s)`} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <DataTable
          columns={[
            { key: "label", label: "Faixa de IDEB" },
            { key: "n", label: "Municípios", align: "right", value: (f) => f.n, render: (f) => fmtInt(f.n) },
            { key: "pct", label: "% do total", align: "right", value: (f) => (stats.n ? (f.n / stats.n) * 100 : 0), render: (f) => fmtPct(stats.n ? (f.n / stats.n) * 100 : 0, 1) },
          ]}
          rows={faixas}
          pageSize={6}
          exportFilename={`faixas_ideb_${etapa}_${rede}`}
        />
      </div>

      <div className="card">
        <h3>Boxplot por {agrupar === "uf" ? "UF" : "Região"}</h3>
        <BoxplotChart grupos={grupos} height={agrupar === "uf" ? 620 : 260} />
      </div>
    </div>
  );
}
