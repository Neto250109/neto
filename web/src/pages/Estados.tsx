import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import { describe } from "../lib/stats";
import { fmtDelta, fmtInt, fmtNum, fmtPct } from "../lib/format";
import DataTable from "../components/DataTable";

export default function Estados() {
  const { meta } = useDataStore();
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [regiao, setRegiao] = useState("");
  const { rows, loading } = useEtapaRows(etapa);

  const porUf = useMemo(() => {
    const ufs = meta?.ufs.filter((u) => !regiao || u.regiao === regiao) ?? [];
    return ufs.map((u) => {
      const rs = rows.filter((r) => r.rede === rede && r.uf === u.uf);
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
      return { uf: u.uf, uf_nome: u.uf_nome, regiao: u.regiao, stats, delta: stats.media !== null && media2023 !== null ? stats.media - media2023 : null, pctAcima: metaCmp.length ? (acima / metaCmp.length) * 100 : null };
    });
  }, [rows, rede, regiao, meta]);

  return (
    <div>
      <h1 className="page-title">Estados</h1>
      <p className="page-subtitle">Ranking das 27 unidades federativas — clique para o detalhamento municipal do estado.</p>

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
        <select value={regiao} onChange={(e) => setRegiao(e.target.value)}>
          <option value="">Todas as regiões</option>
          {meta?.regioes.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {loading && <span className="muted">carregando…</span>}
      </div>

      <div className="card">
        <DataTable
          columns={[
            { key: "uf", label: "UF", render: (r) => <Link to={`/territorio/uf/${r.uf}`}>{r.uf}</Link>, width: 60 },
            { key: "uf_nome", label: "Estado" },
            { key: "regiao", label: "Região" },
            { key: "n", label: "Municípios", align: "right", value: (r) => r.stats.n, render: (r) => fmtInt(r.stats.n) },
            { key: "media", label: "IDEB médio", align: "right", value: (r) => r.stats.media, render: (r) => fmtNum(r.stats.media, 3) },
            { key: "mediana", label: "Mediana", align: "right", value: (r) => r.stats.mediana, render: (r) => fmtNum(r.stats.mediana, 3) },
            { key: "max", label: "Maior IDEB", align: "right", value: (r) => r.stats.max, render: (r) => fmtNum(r.stats.max, 2) },
            { key: "min", label: "Menor IDEB", align: "right", value: (r) => r.stats.min, render: (r) => fmtNum(r.stats.min, 2) },
            { key: "delta", label: "Evolução 2023→2025", align: "right", value: (r) => r.delta, render: (r) => fmtDelta(r.delta, 3) },
            { key: "pctAcima", label: "% acima da meta", align: "right", value: (r) => r.pctAcima, render: (r) => fmtPct(r.pctAcima, 1) },
          ]}
          rows={porUf}
          defaultSortKey="media"
          pageSize={27}
          onRowClick={(r) => navigate(`/territorio/uf/${r.uf}`)}
          exportFilename={`estados_${etapa}_${rede}`}
        />
      </div>
    </div>
  );
}
