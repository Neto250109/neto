import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { useEtapaRows, valorNoAno } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import { median } from "../lib/stats";
import Chart from "../components/Chart";
import DataTable from "../components/DataTable";
import { fmtNum } from "../lib/format";
import { tokens, SEQUENTIAL_BLUE } from "../lib/colors";

export default function Decomposicao() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const { rows, loading } = useEtapaRows(etapa);
  const t = tokens();

  const dados = useMemo(() => {
    return rows
      .filter((r) => r.rede === rede)
      .map((r) => ({
        row: r,
        rend: valorNoAno(r, "rend", 2025),
        nm: valorNoAno(r, "nm", 2025),
        ideb: valorNoAno(r, "ideb", 2025),
      }))
      .filter((d) => d.rend !== null && d.nm !== null);
  }, [rows, rede]);

  const medRend = median(dados.map((d) => d.rend));
  const medNm = median(dados.map((d) => d.nm));

  const classificados = dados.map((d) => {
    const baixoRend = medRend !== null && d.rend !== null && d.rend < medRend;
    const baixoNm = medNm !== null && d.nm !== null && d.nm < medNm;
    let fator: string;
    if (baixoRend && baixoNm) fator = "Rendimento e SAEB";
    else if (baixoRend) fator = "Rendimento";
    else if (baixoNm) fator = "Desempenho SAEB";
    else fator = "Nenhum (acima da mediana em ambos)";
    return { ...d, fator };
  });

  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 50, right: 20, top: 16, bottom: 40 },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.border,
      textStyle: { color: t.textPrimary },
      formatter: (p: unknown) => {
        const pp = p as { data: [number, number, string, number] };
        return `<b>${pp.data[2]}</b><br/>Rendimento: ${pp.data[0].toFixed(3)}<br/>Nota Padronizada: ${pp.data[1].toFixed(2)}<br/>IDEB: ${pp.data[3]?.toFixed(1) ?? "ND"}`;
      },
    },
    visualMap: {
      dimension: 3,
      min: 0,
      max: 10,
      right: 10,
      top: "middle",
      calculable: true,
      inRange: { color: SEQUENTIAL_BLUE },
      textStyle: { color: t.muted },
    },
    xAxis: { type: "value", name: "Indicador de Rendimento", min: 0, max: 1, splitLine: { lineStyle: { color: t.gridline } }, axisLabel: { color: t.muted } },
    yAxis: { type: "value", name: "Nota Média Padronizada", splitLine: { lineStyle: { color: t.gridline } }, axisLabel: { color: t.muted } },
    series: [
      {
        type: "scatter",
        symbolSize: 5,
        data: dados.map((d) => [d.rend, d.nm, d.row.nome, d.ideb]),
      },
    ],
  };

  return (
    <div>
      <h1 className="page-title">Decomposição do IDEB</h1>
      <p className="page-subtitle">
        IDEB = Indicador de Rendimento × Nota Média Padronizada. O diagrama de dispersão mostra, para cada município, os dois componentes — permitindo identificar se o desempenho está mais
        associado ao fluxo escolar (rendimento) ou ao aprendizado medido pelo SAEB.
      </p>

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

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>
          Rendimento × Nota Padronizada — 2025 ({etapa}, {rede})
        </h3>
        <Chart option={option} height={440} />
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Mediana do rendimento: {fmtNum(medRend, 3)} · Mediana da nota padronizada: {fmtNum(medNm, 2)}
        </p>
      </div>

      <div className="card">
        <h3>Fator limitante por município</h3>
        <DataTable
          columns={[
            { key: "nome", label: "Município", render: (d) => d.row.nome },
            { key: "uf", label: "UF", render: (d) => d.row.uf, width: 56 },
            { key: "rend", label: "Rendimento", align: "right", value: (d) => d.rend, render: (d) => fmtNum(d.rend, 3) },
            { key: "nm", label: "Nota Padronizada", align: "right", value: (d) => d.nm, render: (d) => fmtNum(d.nm, 2) },
            { key: "ideb", label: "IDEB 2025", align: "right", value: (d) => d.ideb, render: (d) => fmtNum(d.ideb, 1) },
            { key: "fator", label: "Abaixo da mediana em" },
          ]}
          rows={classificados}
          defaultSortKey="ideb"
          defaultSortDir="asc"
          pageSize={20}
          onRowClick={(d) => navigate(`/municipio/${d.row.codigo}`)}
          exportFilename={`decomposicao_${etapa}_${rede}`}
        />
      </div>
    </div>
  );
}
