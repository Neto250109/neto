import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import { computeRankings } from "../lib/rankings";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import KpiCard from "../components/KpiCard";
import LineSeriesChart from "../components/charts/LineSeriesChart";
import BarRankChart from "../components/charts/BarRankChart";
import { fmtDelta, fmtNum } from "../lib/format";
import { catColor } from "../lib/colors";

function usePainelEtapa(etapa: Etapa, codigo: string | undefined) {
  const { rows, loading } = useEtapaRows(etapa);
  return { allRows: rows, rows: rows.filter((r) => r.codigo === codigo), loading };
}

export default function PerfilMunicipal() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { municipios, meta, seriesAgregadas } = useDataStore();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");

  const dim = codigo ? municipios?.[codigo] : undefined;
  const ai = usePainelEtapa("Anos Iniciais", codigo);
  const af = usePainelEtapa("Anos Finais", codigo);
  const em = usePainelEtapa("Ensino Médio", codigo);
  const porEtapa: Record<Etapa, typeof ai> = { "Anos Iniciais": ai, "Anos Finais": af, "Ensino Médio": em };

  const atual = porEtapa[etapa];
  const linhaRede = atual.rows.find((r) => r.rede === rede);

  const ideb2025 = linhaRede ? valorNoAno(linhaRede, "ideb", 2025) : null;
  const ideb2023 = linhaRede ? valorNoAno(linhaRede, "ideb", 2023) : null;
  const deltaAbs = ideb2025 !== null && ideb2023 !== null ? ideb2025 - ideb2023 : null;
  const ultMeta = linhaRede ? ultimoDisponivel(linhaRede, "meta") : null;
  const obsNaMeta = linhaRede && ultMeta ? valorNoAno(linhaRede, "ideb", ultMeta.ano) : null;
  const diffMeta = ultMeta && obsNaMeta !== null ? obsNaMeta - ultMeta.valor : null;

  const posicao = useMemo(() => {
    if (!codigo || !atual.allRows.length) return null;
    const rankings = computeRankings(atual.allRows.filter((r) => r.rede === rede), 2025);
    return rankings.get(codigo) ?? null;
  }, [atual.allRows, rede, codigo]);

  const componentesAno = useMemo(() => {
    if (!linhaRede) return null;
    const idx = linhaRede.anos.indexOf(2025);
    if (idx === -1) return null;
    return {
      aprov: linhaRede.aprov[idx],
      rend: linhaRede.rend[idx],
      mat: linhaRede.mat[idx],
      port: linhaRede.port[idx],
      nm: linhaRede.nm[idx],
    };
  }, [linhaRede]);

  const comparativoRedes = REDES.map((r) => {
    const row = atual.rows.find((x) => x.rede === r);
    return { rede: r, v: row ? valorNoAno(row, "ideb", 2025) : null };
  }).filter((x) => x.v !== null);

  const comparativoEtapas = ETAPAS.map((e) => {
    const row = porEtapa[e].rows.find((x) => x.rede === rede);
    return { etapa: e, v: row ? valorNoAno(row, "ideb", 2025) : null };
  });

  const seriesComparativas = useMemo(() => {
    if (!linhaRede || !dim) return [];
    const anos = linhaRede.anos;
    const brasil = seriesAgregadas?.Brasil?.[etapa]?.ideb?.[rede];
    const regiaoS = seriesAgregadas?.Regiao?.[etapa]?.ideb?.[dim.regiao]?.[rede];
    const ufS = seriesAgregadas?.UF?.[etapa]?.ideb?.[dim.uf]?.[rede];
    return [
      { name: dim.nome, data: linhaRede.ideb },
      { name: dim.uf, data: anos.map((a) => ufS?.[String(a)]?.media ?? null) },
      { name: dim.regiao, data: anos.map((a) => regiaoS?.[String(a)]?.media ?? null) },
      { name: "Brasil", data: anos.map((a) => brasil?.[String(a)]?.media ?? null) },
    ];
  }, [linhaRede, dim, seriesAgregadas, etapa, rede]);

  if (!dim) {
    return (
      <div>
        <h1 className="page-title">Perfil Municipal</h1>
        <p className="muted">Selecione um município na página de Municípios, Ranking ou Mapa.</p>
        <button className="btn" onClick={() => navigate("/municipios")}>
          Ir para Municípios
        </button>
      </div>
    );
  }

  return (
    <div>
      <button className="btn" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        ‹ Voltar
      </button>
      <h1 className="page-title">
        {dim.nome} <span className="muted" style={{ fontWeight: 400 }}>— {dim.uf_nome} ({dim.uf})</span>
      </h1>
      <p className="page-subtitle">
        Região {dim.regiao} · Código IBGE {codigo}
      </p>

      <div className="card" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <span className="pill-label">Etapa:</span>
        {ETAPAS.map((e) => (
          <button key={e} className="btn" onClick={() => setEtapa(e)} style={{ background: etapa === e ? "#2a78d6" : undefined, color: etapa === e ? "#fff" : undefined }}>
            {e}
          </button>
        ))}
        <span className="pill-label" style={{ marginLeft: 10 }}>
          Rede:
        </span>
        {REDES.map((r) => (
          <button key={r} className="btn" onClick={() => setRede(r)} style={{ background: rede === r ? "#2a78d6" : undefined, color: rede === r ? "#fff" : undefined }}>
            {r}
          </button>
        ))}
      </div>

      {!linhaRede ? (
        <p className="muted">Sem dados para {etapa} / rede {rede} neste município.</p>
      ) : (
        <>
          <div className="grid kpi-grid" style={{ marginBottom: 20 }}>
            <KpiCard label="IDEB 2025" value={fmtNum(ideb2025, 1)} accent="#2a78d6" />
            <KpiCard label="IDEB 2023" value={fmtNum(ideb2023, 1)} />
            <KpiCard label="Variação 2023→2025" value={fmtDelta(deltaAbs, 2)} deltaGood={deltaAbs !== null ? deltaAbs >= 0 : null} />
            <KpiCard label={`Meta (${ultMeta?.ano ?? "—"})`} value={fmtNum(ultMeta?.valor ?? null, 2)} />
            <KpiCard label="Diferença da meta" value={fmtDelta(diffMeta, 2)} deltaGood={diffMeta !== null ? diffMeta >= 0 : null} sub={ultMeta ? `observado em ${ultMeta.ano}` : ""} />
            <KpiCard
              label="Ranking estadual"
              value={posicao ? `${posicao.rankEstadual}º` : "ND"}
              sub={posicao ? `de ${posicao.totalEstadual} municípios (${dim.uf})` : "IDEB 2025 indisponível"}
              accent="var(--status-good)"
            />
            <KpiCard
              label="Ranking nacional"
              value={posicao ? `${posicao.rankNacional}º` : "ND"}
              sub={posicao ? `de ${posicao.totalNacional} municípios (Brasil)` : "IDEB 2025 indisponível"}
            />
          </div>

          <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
            <div className="card">
              <h3>
                {dim.nome} × {dim.uf} × {dim.regiao} × Brasil — IDEB ({etapa}, {rede})
              </h3>
              <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                Comparação da evolução histórica do município com as médias estadual, regional e nacional.
              </p>
              <LineSeriesChart categorias={linhaRede.anos} series={seriesComparativas} />
            </div>
            <div className="card">
              <h3>Componentes do IDEB — 2025</h3>
              <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                IDEB = Indicador de Rendimento × Nota Média Padronizada
              </p>
              {componentesAno ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  <li>Taxa de Aprovação: <b className="tabular">{fmtNum(componentesAno.aprov, 1)}%</b></li>
                  <li>Indicador de Rendimento: <b className="tabular">{fmtNum(componentesAno.rend, 3)}</b></li>
                  <li>Nota SAEB — Matemática: <b className="tabular">{fmtNum(componentesAno.mat, 1)}</b></li>
                  <li>Nota SAEB — Língua Portuguesa: <b className="tabular">{fmtNum(componentesAno.port, 1)}</b></li>
                  <li>Nota Média Padronizada: <b className="tabular">{fmtNum(componentesAno.nm, 3)}</b></li>
                </ul>
              ) : (
                <p className="muted">Sem componentes disponíveis para 2025.</p>
              )}
              <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>{meta?.fonte}</p>
            </div>
          </div>

          <div className="grid chart-grid-2">
            <div className="card">
              <h3>Comparação entre redes — IDEB 2025 ({etapa})</h3>
              <BarRankChart
                categorias={comparativoRedes.map((c) => c.rede)}
                valores={comparativoRedes.map((c) => c.v)}
                colorFn={(_, i) => catColor(i)}
              />
            </div>
            <div className="card">
              <h3>Comparação entre etapas — IDEB 2025 (rede {rede})</h3>
              <BarRankChart
                categorias={comparativoEtapas.map((c) => c.etapa)}
                valores={comparativoEtapas.map((c) => c.v)}
                colorFn={(_, i) => catColor(i)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
