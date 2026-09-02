import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import LineSeriesChart, { type LineSeries } from "../components/charts/LineSeriesChart";
import BarRankChart from "../components/charts/BarRankChart";
import DataTable from "../components/DataTable";
import { fmtDelta, fmtNum } from "../lib/format";
import { classificarEvolucao, LIMITES_EVOLUCAO_PADRAO, type LimitesEvolucao } from "../lib/stats";
import { STATUS } from "../lib/colors";

type Nivel = "Brasil" | "Regiao" | "UF" | "Municipio";

function SerieHistoricaTab() {
  const { meta, seriesAgregadas, municipios } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [nivel, setNivel] = useState<Nivel>("UF");
  const [selecionados, setSelecionados] = useState<string[]>(["RN", "CE", "PE", "BA"]);
  const [busca, setBusca] = useState("");
  const { rows: municipioRows } = useEtapaRows(etapa);

  const anos = meta?.etapas[etapa]?.anos ?? [];

  const opcoesNivel = useMemo(() => {
    if (nivel === "Regiao") return meta?.regioes.map((r) => ({ value: r, label: r })) ?? [];
    if (nivel === "UF") return meta?.ufs.map((u) => ({ value: u.uf, label: `${u.uf} — ${u.uf_nome}` })) ?? [];
    if (nivel === "Municipio" && municipios) {
      const termo = busca.trim().toLowerCase();
      if (!termo) return [];
      return Object.entries(municipios)
        .filter(([, d]) => d.nome.toLowerCase().includes(termo))
        .slice(0, 30)
        .map(([codigo, d]) => ({ value: codigo, label: `${d.nome} — ${d.uf}` }));
    }
    return [];
  }, [nivel, meta, municipios, busca]);

  function toggle(v: string) {
    setSelecionados((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }

  const series: LineSeries[] = useMemo(() => {
    if (nivel === "Brasil") {
      const node = seriesAgregadas?.Brasil?.[etapa]?.ideb?.[rede];
      return [{ name: "Brasil", data: anos.map((a) => node?.[String(a)]?.media ?? null) }];
    }
    if (nivel === "Regiao") {
      return selecionados.map((r) => {
        const node = seriesAgregadas?.Regiao?.[etapa]?.ideb?.[r]?.[rede];
        return { name: r, data: anos.map((a) => node?.[String(a)]?.media ?? null) };
      });
    }
    if (nivel === "UF") {
      return selecionados.map((uf) => {
        const node = seriesAgregadas?.UF?.[etapa]?.ideb?.[uf]?.[rede];
        return { name: uf, data: anos.map((a) => node?.[String(a)]?.media ?? null) };
      });
    }
    // Municipio
    return selecionados
      .map((cod) => {
        const row = municipioRows.find((r) => r.codigo === cod && r.rede === rede);
        const dim = municipios?.[cod];
        if (!row || !dim) return null;
        return { name: `${dim.nome} (${dim.uf})`, data: anos.map((a) => valorNoAno(row, "ideb", a)) };
      })
      .filter((s): s is LineSeries => s !== null);
  }, [nivel, selecionados, seriesAgregadas, etapa, rede, anos, municipioRows, municipios]);

  return (
    <div>
      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
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
        <select
          value={nivel}
          onChange={(e) => {
            setNivel(e.target.value as Nivel);
            setSelecionados(e.target.value === "Brasil" ? ["Brasil"] : []);
          }}
        >
          <option value="Brasil">Brasil</option>
          <option value="Regiao">Região</option>
          <option value="UF">UF</option>
          <option value="Municipio">Município</option>
        </select>
      </div>

      {nivel !== "Brasil" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="pill-label" style={{ marginBottom: 8 }}>
            Selecione para comparar (seleção múltipla):
          </p>
          {nivel === "Municipio" && (
            <input type="search" placeholder="Buscar município para adicionar…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ marginBottom: 8, width: 280 }} />
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {opcoesNivel.map((o) => (
              <button
                key={o.value}
                className="btn"
                onClick={() => toggle(o.value)}
                style={{ background: selecionados.includes(o.value) ? "#2a78d6" : undefined, color: selecionados.includes(o.value) ? "#fff" : undefined }}
              >
                {o.label}
              </button>
            ))}
          </div>
          {selecionados.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {selecionados.map((s) => (
                <span key={s} className="badge" style={{ background: "color-mix(in srgb, #2a78d6 15%, transparent)", color: "#2a78d6" }}>
                  {s} <span style={{ cursor: "pointer" }} onClick={() => toggle(s)}>✕</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h3>Série histórica — IDEB ({etapa}, rede {rede})</h3>
        {series.length === 0 ? <p className="muted">Selecione ao menos uma entidade para comparar.</p> : <LineSeriesChart categorias={anos} series={series} height={420} />}
      </div>
    </div>
  );
}

function Evolucao2325Tab() {
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [regiao, setRegiao] = useState("");
  const [limites, setLimites] = useState<LimitesEvolucao>(LIMITES_EVOLUCAO_PADRAO);
  const { rows, loading } = useEtapaRows(etapa);
  const { meta } = useDataStore();
  const navigate = useNavigate();

  const dados = useMemo(() => {
    return rows
      .filter((r) => r.rede === rede)
      .filter((r) => !regiao || r.regiao === regiao)
      .map((r) => {
        const v25 = valorNoAno(r, "ideb", 2025);
        const v23 = valorNoAno(r, "ideb", 2023);
        const delta = v25 !== null && v23 !== null ? v25 - v23 : null;
        const deltaPct = v25 !== null && v23 !== null && v23 !== 0 ? (v25 / v23 - 1) * 100 : null;
        return { row: r, v25, v23, delta, deltaPct, classe: classificarEvolucao(delta, limites) };
      })
      .filter((d) => d.delta !== null);
  }, [rows, rede, regiao, limites]);

  const ordenado = [...dados].sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  const maiorCrescimento = ordenado.slice(0, 15);
  const menorCrescimento = ordenado.slice(-15).reverse();

  const contagemClasses = (["Forte crescimento", "Crescimento", "Estabilidade", "Queda", "Forte queda"] as const).map((c) => ({
    classe: c,
    n: dados.filter((d) => d.classe === c).length,
  }));
  const corClasse: Record<string, string> = {
    "Forte crescimento": STATUS.good,
    Crescimento: "#1baf7a",
    Estabilidade: STATUS.warning,
    Queda: STATUS.serious,
    "Forte queda": STATUS.critical,
  };

  return (
    <div>
      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
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

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="pill-label" style={{ marginBottom: 8 }}>
          Limites de classificação (parametrizáveis, em pontos de IDEB):
        </p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5 }}>
          <label>
            Forte crescimento ≥{" "}
            <input type="number" step={0.1} value={limites.forteCrescimento} onChange={(e) => setLimites({ ...limites, forteCrescimento: Number(e.target.value) })} style={{ width: 60 }} />
          </label>
          <label>
            Crescimento ≥{" "}
            <input type="number" step={0.1} value={limites.crescimento} onChange={(e) => setLimites({ ...limites, crescimento: Number(e.target.value) })} style={{ width: 60 }} />
          </label>
          <label>
            Estabilidade: |Δ| &lt;{" "}
            <input type="number" step={0.1} value={limites.estabilidade} onChange={(e) => setLimites({ ...limites, estabilidade: Number(e.target.value) })} style={{ width: 60 }} />
          </label>
          <label>
            Forte queda ≤{" "}
            <input type="number" step={0.1} value={limites.forteQueda} onChange={(e) => setLimites({ ...limites, forteQueda: Number(e.target.value) })} style={{ width: 60 }} />
          </label>
        </div>
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Maior crescimento (Top 15)</h3>
          <BarRankChart categorias={maiorCrescimento.map((d) => `${d.row.nome} (${d.row.uf})`).reverse()} valores={maiorCrescimento.map((d) => d.delta).reverse()} colorFn={() => STATUS.good} />
        </div>
        <div className="card">
          <h3>Menor crescimento / maior queda (Top 15)</h3>
          <BarRankChart categorias={menorCrescimento.map((d) => `${d.row.nome} (${d.row.uf})`).reverse()} valores={menorCrescimento.map((d) => d.delta).reverse()} colorFn={() => STATUS.critical} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Distribuição por classificação de evolução</h3>
        <BarRankChart
          categorias={contagemClasses.map((c) => c.classe)}
          valores={contagemClasses.map((c) => c.n)}
          horizontal={false}
          colorFn={(_, i) => corClasse[contagemClasses[i].classe]}
          valueFmt={(v) => `${v} município(s)`}
        />
      </div>

      <div className="card">
        <h3>Tabela completa — IDEB 2023 × 2025</h3>
        <DataTable
          columns={[
            { key: "nome", label: "Município", render: (d) => d.row.nome },
            { key: "uf", label: "UF", render: (d) => d.row.uf, width: 56 },
            { key: "v2023", label: "IDEB 2023", align: "right", value: (d) => d.v23, render: (d) => fmtNum(d.v23, 1) },
            { key: "v2025", label: "IDEB 2025", align: "right", value: (d) => d.v25, render: (d) => fmtNum(d.v25, 1) },
            { key: "delta", label: "Variação abs.", align: "right", value: (d) => d.delta, render: (d) => fmtDelta(d.delta, 2) },
            { key: "deltaPct", label: "Variação %", align: "right", value: (d) => d.deltaPct, render: (d) => fmtDelta(d.deltaPct, 1) },
            {
              key: "classe",
              label: "Classificação",
              render: (d) => (
                <span className="badge" style={{ background: `color-mix(in srgb, ${corClasse[d.classe ?? ""]} 18%, transparent)`, color: corClasse[d.classe ?? ""] }}>
                  {d.classe}
                </span>
              ),
            },
          ]}
          rows={ordenado}
          defaultSortKey="delta"
          pageSize={20}
          onRowClick={(d) => navigate(`/municipio/${d.row.codigo}`)}
          exportFilename={`evolucao_2023_2025_${etapa}_${rede}`}
          csvRows={(rs) => rs.map((d) => ({ municipio: d.row.nome, uf: d.row.uf, ideb_2023: d.v23, ideb_2025: d.v25, variacao_absoluta: d.delta, variacao_percentual: d.deltaPct, classificacao: d.classe }))}
        />
      </div>
    </div>
  );
}

export default function Evolucao() {
  const [tab, setTab] = useState<"serie" | "2325">("serie");
  return (
    <div>
      <h1 className="page-title">Evolução</h1>
      <p className="page-subtitle">Série histórica comparativa e evolução do IDEB entre 2023 e 2025.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button className="btn" onClick={() => setTab("serie")} style={{ background: tab === "serie" ? "#2a78d6" : undefined, color: tab === "serie" ? "#fff" : undefined }}>
          Série Histórica
        </button>
        <button className="btn" onClick={() => setTab("2325")} style={{ background: tab === "2325" ? "#2a78d6" : undefined, color: tab === "2325" ? "#fff" : undefined }}>
          Evolução 2023 × 2025
        </button>
      </div>
      {tab === "serie" ? <SerieHistoricaTab /> : <Evolucao2325Tab />}
    </div>
  );
}
