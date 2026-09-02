import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEtapaRows, valorNoAno } from "../lib/useEtapaRows";
import { useDataStore } from "../lib/dataStore";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import DataTable from "../components/DataTable";
import Chart from "../components/Chart";
import { fmtDelta, fmtNum } from "../lib/format";
import { classificarMeta } from "../lib/stats";
import { STATUS, tokens } from "../lib/colors";
import type { EChartsOption } from "echarts";

const ANOS_META: Record<Etapa, number[]> = {
  "Anos Iniciais": [2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021],
  "Anos Finais": [2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021],
  "Ensino Médio": [2019, 2021],
};

const CLASSE_COR: Record<string, string> = { "Acima da meta": STATUS.good, "Atingiu a meta": STATUS.warning, "Abaixo da meta": STATUS.critical };

export default function IdebMeta() {
  const navigate = useNavigate();
  const { meta } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [regiao, setRegiao] = useState("");
  const [uf, setUf] = useState("");
  const anos = ANOS_META[etapa];
  const [ano, setAno] = useState(anos[anos.length - 1]);
  const { rows, loading } = useEtapaRows(etapa);
  const t = tokens();

  const dados = useMemo(() => {
    return rows
      .filter((r) => r.rede === rede)
      .filter((r) => !regiao || r.regiao === regiao)
      .filter((r) => !uf || r.uf === uf)
      .map((r) => {
        const observado = valorNoAno(r, "ideb", ano);
        const metaV = valorNoAno(r, "meta", ano);
        const diff = observado !== null && metaV !== null ? observado - metaV : null;
        return { row: r, observado, meta: metaV, diff, classe: classificarMeta(observado, metaV) };
      })
      .filter((d) => d.observado !== null && d.meta !== null);
  }, [rows, rede, regiao, uf, ano]);

  const acima = dados.filter((d) => d.classe === "Acima da meta").length;
  const atingiu = dados.filter((d) => d.classe === "Atingiu a meta").length;
  const abaixo = dados.filter((d) => d.classe === "Abaixo da meta").length;

  const scatterOption: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 50, right: 20, top: 16, bottom: 40 },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.border,
      textStyle: { color: t.textPrimary },
      formatter: (p: unknown) => {
        const pp = p as { data: [number, number, string] };
        return `<b>${pp.data[2]}</b><br/>Meta: ${pp.data[0].toFixed(2)}<br/>Observado: ${pp.data[1].toFixed(2)}`;
      },
    },
    xAxis: { type: "value", name: "Meta", min: 0, max: 10, splitLine: { lineStyle: { color: t.gridline } }, axisLabel: { color: t.muted } },
    yAxis: { type: "value", name: "IDEB observado", min: 0, max: 10, splitLine: { lineStyle: { color: t.gridline } }, axisLabel: { color: t.muted } },
    series: [
      {
        type: "line",
        data: [
          [0, 0],
          [10, 10],
        ],
        showSymbol: false,
        lineStyle: { color: t.baseline, type: "dashed", width: 1.5 },
        tooltip: { show: false },
        silent: true,
      },
      {
        type: "scatter",
        symbolSize: 6,
        data: dados.map((d) => [d.meta, d.observado, d.row.nome]),
        itemStyle: {
          color: (p: unknown) => {
            const data = (p as { data: [number, number, string] }).data;
            return data[1] >= data[0] ? STATUS.good : STATUS.critical;
          },
          opacity: 0.65,
        },
      },
    ],
  };

  return (
    <div>
      <h1 className="page-title">IDEB Observado × Meta</h1>
      <p className="page-subtitle">
        Comparação entre o IDEB observado e a meta projetada pelo INEP. Metas do 1º ciclo do Ideb estão disponíveis apenas até {ANOS_META[etapa].slice(-1)[0]}; não há meta divulgada para 2023/2025
        neste arquivo — nenhum valor é estimado.
      </p>

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <select
          value={etapa}
          onChange={(e) => {
            const et = e.target.value as Etapa;
            setEtapa(et);
            setAno(ANOS_META[et][ANOS_META[et].length - 1]);
          }}
        >
          {ETAPAS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select value={rede} onChange={(e) => setRede(e.target.value as Rede)}>
          {REDES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={regiao} onChange={(e) => setRegiao(e.target.value)}>
          <option value="">Todas as regiões</option>
          {meta?.regioes.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">Todas as UFs</option>
          {meta?.ufs.map((u) => (
            <option key={u.uf} value={u.uf}>
              {u.uf}
            </option>
          ))}
        </select>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
          {anos.map((a) => (
            <option key={a} value={a}>
              Meta/ano {a}
            </option>
          ))}
        </select>
        {loading && <span className="muted">carregando…</span>}
      </div>

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        <div className="card" style={{ borderTop: `3px solid ${STATUS.good}` }}>
          <div className="muted" style={{ fontSize: 12 }}>Acima da meta</div>
          <div className="tabular" style={{ fontSize: 26, fontWeight: 700 }}>
            {acima} <span style={{ fontSize: 14, fontWeight: 500 }}>({dados.length ? ((acima / dados.length) * 100).toFixed(1) : 0}%)</span>
          </div>
        </div>
        <div className="card" style={{ borderTop: `3px solid ${STATUS.warning}` }}>
          <div className="muted" style={{ fontSize: 12 }}>Atingiu a meta</div>
          <div className="tabular" style={{ fontSize: 26, fontWeight: 700 }}>
            {atingiu} <span style={{ fontSize: 14, fontWeight: 500 }}>({dados.length ? ((atingiu / dados.length) * 100).toFixed(1) : 0}%)</span>
          </div>
        </div>
        <div className="card" style={{ borderTop: `3px solid ${STATUS.critical}` }}>
          <div className="muted" style={{ fontSize: 12 }}>Abaixo da meta</div>
          <div className="tabular" style={{ fontSize: 26, fontWeight: 700 }}>
            {abaixo} <span style={{ fontSize: 14, fontWeight: 500 }}>({dados.length ? ((abaixo / dados.length) * 100).toFixed(1) : 0}%)</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>IDEB observado × Meta ({ano})</h3>
        <Chart option={scatterOption} height={420} />
      </div>

      <div className="card">
        <DataTable
          columns={[
            { key: "nome", label: "Município", render: (d) => d.row.nome },
            { key: "uf", label: "UF", render: (d) => d.row.uf, width: 56 },
            { key: "observado", label: `IDEB ${ano}`, align: "right", value: (d) => d.observado, render: (d) => fmtNum(d.observado, 2) },
            { key: "meta", label: `Meta ${ano}`, align: "right", value: (d) => d.meta, render: (d) => fmtNum(d.meta, 2) },
            { key: "diff", label: "Diferença", align: "right", value: (d) => d.diff, render: (d) => fmtDelta(d.diff, 2) },
            {
              key: "classe",
              label: "Classificação",
              render: (d) => (
                <span className="badge" style={{ background: `color-mix(in srgb, ${CLASSE_COR[d.classe ?? ""]} 18%, transparent)`, color: CLASSE_COR[d.classe ?? ""] }}>
                  {d.classe}
                </span>
              ),
            },
          ]}
          rows={dados}
          defaultSortKey="diff"
          pageSize={20}
          onRowClick={(d) => navigate(`/municipio/${d.row.codigo}`)}
          exportFilename={`ideb_meta_${etapa}_${ano}`}
          csvRows={(rs) => rs.map((d) => ({ municipio: d.row.nome, uf: d.row.uf, ideb_observado: d.observado, meta: d.meta, diferenca: d.diff, classificacao: d.classe }))}
        />
      </div>
    </div>
  );
}
