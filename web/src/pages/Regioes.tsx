import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES, REGIOES } from "../types";
import { describe } from "../lib/stats";
import { fmtDelta, fmtInt, fmtNum, fmtPct } from "../lib/format";
import DataTable from "../components/DataTable";
import { catColor } from "../lib/colors";

export default function Regioes() {
  const { meta } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const { rows, loading } = useEtapaRows(etapa);

  const porRegiao = useMemo(() => {
    return REGIOES.map((regiao) => {
      const rs = rows.filter((r) => r.rede === rede && r.regiao === regiao);
      const v2025 = rs.map((r) => valorNoAno(r, "ideb", 2025)).filter((v): v is number => v !== null);
      const v2023 = rs.map((r) => valorNoAno(r, "ideb", 2023)).filter((v): v is number => v !== null);
      const stats = describe(v2025);
      const media2023 = describe(v2023).media;
      const metaCmp = rs
        .map((r) => {
          const um = ultimoDisponivel(r, "meta");
          if (!um) return null;
          const obs = valorNoAno(r, "ideb", um.ano);
          return obs !== null ? obs - um.valor : null;
        })
        .filter((v): v is number => v !== null);
      const acima = metaCmp.filter((v) => v >= 0).length;
      return { regiao, stats, delta: stats.media !== null && media2023 !== null ? stats.media - media2023 : null, pctAcima: metaCmp.length ? (acima / metaCmp.length) * 100 : null };
    });
  }, [rows, rede]);

  return (
    <div>
      <h1 className="page-title">Regiões</h1>
      <p className="page-subtitle">Comparação entre as cinco grandes regiões brasileiras — clique em uma região para o detalhamento estadual e municipal.</p>

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
        {porRegiao.map((p, i) => (
          <Link key={p.regiao} to={`/territorio/regiao/${p.regiao}`} className="card" style={{ borderTop: `3px solid ${catColor(i)}`, textDecoration: "none", color: "inherit", display: "block" }}>
            <div style={{ fontWeight: 700 }}>{p.regiao}</div>
            <div className="tabular" style={{ fontSize: 26, fontWeight: 700, margin: "4px 0 2px" }}>
              {fmtNum(p.stats.media, 3)}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {fmtDelta(p.delta, 2)} vs 2023 · {fmtInt(p.stats.n)} municípios
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <h3>Ranking das regiões</h3>
        <DataTable
          columns={[
            { key: "regiao", label: "Região", render: (r) => <Link to={`/territorio/regiao/${r.regiao}`}>{r.regiao}</Link> },
            { key: "n", label: "Municípios", align: "right", value: (r) => r.stats.n, render: (r) => fmtInt(r.stats.n) },
            { key: "media", label: "IDEB médio", align: "right", value: (r) => r.stats.media, render: (r) => fmtNum(r.stats.media, 3) },
            { key: "mediana", label: "Mediana", align: "right", value: (r) => r.stats.mediana, render: (r) => fmtNum(r.stats.mediana, 3) },
            { key: "max", label: "Maior IDEB", align: "right", value: (r) => r.stats.max, render: (r) => fmtNum(r.stats.max, 2) },
            { key: "min", label: "Menor IDEB", align: "right", value: (r) => r.stats.min, render: (r) => fmtNum(r.stats.min, 2) },
            { key: "delta", label: "Evolução 2023→2025", align: "right", value: (r) => r.delta, render: (r) => fmtDelta(r.delta, 3) },
            { key: "pctAcima", label: "% acima da meta", align: "right", value: (r) => r.pctAcima, render: (r) => fmtPct(r.pctAcima, 1) },
          ]}
          rows={porRegiao}
          defaultSortKey="media"
          pageSize={5}
          exportFilename={`regioes_${etapa}_${rede}`}
        />
      </div>
      <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
        {meta?.fonte}
      </p>
    </div>
  );
}
