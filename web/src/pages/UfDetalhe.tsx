import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import { describe } from "../lib/stats";
import { fmtDelta, fmtInt, fmtNum, fmtPct } from "../lib/format";
import DataTable from "../components/DataTable";
import LineSeriesChart from "../components/charts/LineSeriesChart";
import BarRankChart from "../components/charts/BarRankChart";
import MapView, { type MapDatum } from "../components/MapView";
import KpiCard from "../components/KpiCard";
import { catColor } from "../lib/colors";

const NOME_ESPECIAL: Record<string, string> = { RN: "Rio Grande do Norte" };

export default function UfDetalhe() {
  const { uf } = useParams<{ uf: string }>();
  const navigate = useNavigate();
  const { meta, seriesAgregadas } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const { rows, loading } = useEtapaRows(etapa);
  const anos = meta?.etapas[etapa]?.anos ?? [];
  const ufInfo = meta?.ufs.find((u) => u.uf === uf);

  const rs = useMemo(() => rows.filter((r) => r.rede === rede && r.uf === uf), [rows, rede, uf]);
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

  const serieUf = { name: uf ?? "", data: anos.map((a) => seriesAgregadas?.UF?.[etapa]?.ideb?.[uf ?? ""]?.[rede]?.[String(a)]?.media ?? null) };

  const porRede = REDES.map((r, i) => ({
    rede: r,
    media: seriesAgregadas?.UF?.[etapa]?.ideb?.[uf ?? ""]?.[r]?.["2025"]?.media ?? null,
    cor: catColor(i),
  }));

  const porEtapa = ETAPAS.map((e, i) => ({
    etapa: e,
    media: seriesAgregadas?.UF?.[e]?.ideb?.[uf ?? ""]?.[rede]?.["2025"]?.media ?? null,
    cor: catColor(i),
  }));

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
      <h1 className="page-title">IDEB — {NOME_ESPECIAL[uf ?? ""] ?? ufInfo?.uf_nome ?? uf}</h1>
      <p className="page-subtitle">
        Região {ufInfo?.regiao}. Detalhamento municipal, mapa, evolução histórica, comparação entre redes e etapas.
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

      <div className="grid kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard label="IDEB médio estadual" value={fmtNum(stats.media, 3)} accent="var(--brand)" />
        <KpiCard label="Mediana" value={fmtNum(stats.mediana, 3)} />
        <KpiCard label="Municípios avaliados" value={fmtInt(stats.n)} />
        <KpiCard label="Acima da meta" value={metaCmp.length ? fmtPct((acima / metaCmp.length) * 100, 1) : "ND"} sub={`${acima} de ${metaCmp.length}`} />
        <KpiCard label="Abaixo da meta" value={metaCmp.length ? fmtPct(((metaCmp.length - acima) / metaCmp.length) * 100, 1) : "ND"} sub={`${metaCmp.length - acima} de ${metaCmp.length}`} />
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Evolução histórica — {uf}</h3>
          <LineSeriesChart categorias={anos} series={[serieUf]} />
        </div>
        <div className="card">
          <h3>Mapa municipal — {uf}</h3>
          <MapView dados={mapData} onClickMunicipio={(cod) => navigate(`/municipio/${cod}`)} ufFilter={uf} />
        </div>
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Comparação entre redes — 2025</h3>
          <BarRankChart categorias={porRede.map((p) => p.rede)} valores={porRede.map((p) => p.media)} colorFn={(_, i) => porRede[i].cor} />
        </div>
        <div className="card">
          <h3>Comparação entre etapas — 2025 (rede {rede})</h3>
          <BarRankChart categorias={porEtapa.map((p) => p.etapa)} valores={porEtapa.map((p) => p.media)} colorFn={(_, i) => porEtapa[i].cor} />
        </div>
      </div>

      <div className="card">
        <h3>Ranking municipal — {uf}</h3>
        <DataTable
          columns={[
            { key: "nome", label: "Município" },
            { key: "ideb", label: "IDEB 2025", align: "right", value: (r) => valorNoAno(r, "ideb", 2025), render: (r) => fmtNum(valorNoAno(r, "ideb", 2025), 1) },
            { key: "ideb23", label: "IDEB 2023", align: "right", value: (r) => valorNoAno(r, "ideb", 2023), render: (r) => fmtNum(valorNoAno(r, "ideb", 2023), 1) },
            {
              key: "delta",
              label: "Δ 2023→2025",
              align: "right",
              value: (r) => {
                const a = valorNoAno(r, "ideb", 2025);
                const b = valorNoAno(r, "ideb", 2023);
                return a !== null && b !== null ? a - b : null;
              },
              render: (r) => {
                const a = valorNoAno(r, "ideb", 2025);
                const b = valorNoAno(r, "ideb", 2023);
                return fmtDelta(a !== null && b !== null ? a - b : null, 2);
              },
            },
          ]}
          rows={rs}
          defaultSortKey="ideb"
          pageSize={20}
          onRowClick={(r) => navigate(`/municipio/${r.codigo}`)}
          exportFilename={`uf_${uf}_${etapa}_${rede}`}
        />
      </div>
    </div>
  );
}
