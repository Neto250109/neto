import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import { useDataStore } from "../lib/dataStore";
import { computeRankings } from "../lib/rankings";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import DataTable, { type Column } from "../components/DataTable";
import { fmtDelta, fmtInt, fmtNum } from "../lib/format";

type Ordenacao = "ideb_desc" | "ideb_asc" | "crescimento_desc" | "meta_diff_desc";

export default function Ranking() {
  const navigate = useNavigate();
  const { meta } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [regiao, setRegiao] = useState("");
  const [uf, setUf] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("ideb_desc");
  const [limite, setLimite] = useState<10 | 20 | 50 | 0>(50);
  const [faixaMin, setFaixaMin] = useState<number | "">("");
  const [faixaMax, setFaixaMax] = useState<number | "">("");
  const { rows, loading } = useEtapaRows(etapa);

  const rankings = useMemo(() => computeRankings(rows.filter((r) => r.rede === rede), 2025), [rows, rede]);

  const enriched = useMemo(() => {
    return rows
      .filter((r) => r.rede === rede)
      .filter((r) => !regiao || r.regiao === regiao)
      .filter((r) => !uf || r.uf === uf)
      .map((r) => {
        const ideb2025 = valorNoAno(r, "ideb", 2025);
        const ideb2023 = valorNoAno(r, "ideb", 2023);
        const cresc = ideb2025 !== null && ideb2023 !== null ? ideb2025 - ideb2023 : null;
        const ultMeta = ultimoDisponivel(r, "meta");
        const obsNaMeta = ultMeta ? valorNoAno(r, "ideb", ultMeta.ano) : null;
        const diffMeta = ultMeta && obsNaMeta !== null ? obsNaMeta - ultMeta.valor : null;
        return { row: r, ideb2025, ideb2023, cresc, diffMeta, anoMeta: ultMeta?.ano ?? null, metaValor: ultMeta?.valor ?? null, pos: rankings.get(r.codigo) ?? null };
      })
      .filter((r) => faixaMin === "" || (r.ideb2025 !== null && r.ideb2025 >= faixaMin))
      .filter((r) => faixaMax === "" || (r.ideb2025 !== null && r.ideb2025 <= faixaMax));
  }, [rows, rede, regiao, uf, rankings, faixaMin, faixaMax]);

  const sorted = useMemo(() => {
    const arr = [...enriched];
    const byNullLast = (v: number | null) => (v === null ? -Infinity : v);
    switch (ordenacao) {
      case "ideb_desc":
        return arr.sort((a, b) => byNullLast(b.ideb2025) - byNullLast(a.ideb2025));
      case "ideb_asc":
        return arr.filter((x) => x.ideb2025 !== null).sort((a, b) => byNullLast(a.ideb2025) - byNullLast(b.ideb2025));
      case "crescimento_desc":
        return arr.sort((a, b) => byNullLast(b.cresc) - byNullLast(a.cresc));
      case "meta_diff_desc":
        return arr.sort((a, b) => byNullLast(b.diffMeta) - byNullLast(a.diffMeta));
    }
  }, [enriched, ordenacao]);

  const limitado = limite === 0 ? sorted : sorted.slice(0, limite);

  const ideb10 = enriched.filter((e) => e.ideb2025 === 10);

  const columns: Column<(typeof sorted)[number]>[] = [
    { key: "pos", label: "#", render: (r) => sorted.indexOf(r) + 1, width: 44 },
    { key: "nome", label: "Município", render: (r) => r.row.nome },
    { key: "uf", label: "UF", render: (r) => r.row.uf, width: 56 },
    { key: "regiao", label: "Região", render: (r) => r.row.regiao },
    { key: "ideb2025", label: "IDEB 2025", align: "right", value: (r) => r.ideb2025, render: (r) => fmtNum(r.ideb2025, 1) },
    { key: "posEstado", label: "Pos. estado", align: "right", value: (r) => r.pos?.rankEstadual ?? null, render: (r) => (r.pos ? `${fmtInt(r.pos.rankEstadual)}/${fmtInt(r.pos.totalEstadual)}` : "ND") },
    { key: "posBrasil", label: "Pos. Brasil", align: "right", value: (r) => r.pos?.rankNacional ?? null, render: (r) => (r.pos ? `${fmtInt(r.pos.rankNacional)}/${fmtInt(r.pos.totalNacional)}` : "ND") },
    { key: "cresc", label: "Δ 2023→2025", align: "right", value: (r) => r.cresc, render: (r) => fmtDelta(r.cresc, 2) },
    { key: "meta", label: `Meta (${enriched[0]?.anoMeta ?? "—"})`, align: "right", value: (r) => r.metaValor, render: (r) => fmtNum(r.metaValor, 2) },
    { key: "diffMeta", label: "Dif. da meta", align: "right", value: (r) => r.diffMeta, render: (r) => fmtDelta(r.diffMeta, 2) },
  ];

  return (
    <div>
      <h1 className="page-title">Ranking Municipal</h1>
      <p className="page-subtitle">Ordene, filtre e exporte o ranking de municípios pelo IDEB, crescimento ou diferença para a meta.</p>

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
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
        <select value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">Todas as UFs</option>
          {meta?.ufs.filter((u) => !regiao || u.regiao === regiao).map((u) => (
            <option key={u.uf} value={u.uf}>
              {u.uf} — {u.uf_nome}
            </option>
          ))}
        </select>
        <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}>
          <option value="ideb_desc">Maior IDEB</option>
          <option value="ideb_asc">Menor IDEB</option>
          <option value="crescimento_desc">Maior crescimento (2023→2025)</option>
          <option value="meta_diff_desc">Maior diferença para a meta</option>
        </select>
        <span className="pill-label">Faixa de IDEB:</span>
        <input type="number" step={0.1} placeholder="mín." value={faixaMin} onChange={(e) => setFaixaMin(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: 68 }} />
        <span className="muted">a</span>
        <input type="number" step={0.1} placeholder="máx." value={faixaMax} onChange={(e) => setFaixaMax(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: 68 }} />
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {([10, 20, 50, 0] as const).map((n) => (
            <button key={n} className="btn" onClick={() => setLimite(n)} style={{ background: limite === n ? "var(--brand)" : undefined, color: limite === n ? "#fff" : undefined }}>
              {n === 0 ? "Completo" : `Top ${n}`}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="muted">Carregando dados da etapa…</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <DataTable
          columns={columns}
          rows={limitado}
          pageSize={20}
          exportFilename={`ranking_${etapa}_${rede}`}
          onRowClick={(r) => navigate(`/municipio/${r.row.codigo}`)}
          csvRows={(rs) => rs.map((r) => ({ municipio: r.row.nome, uf: r.row.uf, regiao: r.row.regiao, rede, etapa, ideb_2025: r.ideb2025, ideb_2023: r.ideb2023, variacao: r.cresc, meta: r.metaValor, ano_meta: r.anoMeta, diferenca_meta: r.diffMeta, posicao_estadual: r.pos?.rankEstadual ?? null, total_estadual: r.pos?.totalEstadual ?? null, posicao_nacional: r.pos?.rankNacional ?? null, total_nacional: r.pos?.totalNacional ?? null }))}
        />
      </div>

      <div className="card">
        <h3>Desempenho Máximo — municípios com IDEB = 10</h3>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
          Identificados automaticamente na base para {etapa} / rede {rede} em 2025 — nenhum município é inserido manualmente.
        </p>
        {ideb10.length === 0 ? (
          <p className="muted">Nenhum município com IDEB 10 nesta combinação de etapa/rede.</p>
        ) : (
          <DataTable
            columns={[
              { key: "nome", label: "Município", render: (r) => r.row.nome },
              { key: "uf", label: "UF", render: (r) => r.row.uf, width: 60 },
              { key: "regiao", label: "Região", render: (r) => r.row.regiao },
            ]}
            rows={ideb10}
            onRowClick={(r) => navigate(`/municipio/${r.row.codigo}`)}
            pageSize={20}
          />
        )}
      </div>
    </div>
  );
}
