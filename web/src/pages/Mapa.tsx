import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import { computeRankings } from "../lib/rankings";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import MapView, { type MapDatum, type LegendItem } from "../components/MapView";
import { fmtDelta, fmtNum } from "../lib/format";
import { STATUS } from "../lib/colors";

type IndicadorMapa = "ideb2025" | "crescimento" | "diffMeta" | "aprov2025" | "notaMedia2025" | "statusMeta";
const OPCOES: { key: IndicadorMapa; label: string; min: number; max: number }[] = [
  { key: "ideb2025", label: "IDEB 2025", min: 0, max: 10 },
  { key: "statusMeta", label: "Desempenho em relação à meta", min: 0, max: 1 },
  { key: "crescimento", label: "Crescimento 2023→2025", min: -2, max: 2 },
  { key: "diffMeta", label: "Diferença para a meta", min: -3, max: 3 },
  { key: "aprov2025", label: "Taxa de Aprovação 2025 (%)", min: 0, max: 100 },
  { key: "notaMedia2025", label: "Nota Média Padronizada 2025", min: 0, max: 10 },
];

const CLASSES_META: LegendItem[] = [
  { color: STATUS.good, label: "Acima da meta (≥ +0,2)" },
  { color: STATUS.warning, label: "Próximo da meta (±0,2)" },
  { color: STATUS.serious, label: "Abaixo da meta (-0,2 a -0,8)" },
  { color: STATUS.critical, label: "Muito abaixo da meta (< -0,8)" },
];

function corStatusMeta(diff: number): string {
  if (diff >= 0.2) return STATUS.good;
  if (diff >= -0.2) return STATUS.warning;
  if (diff >= -0.8) return STATUS.serious;
  return STATUS.critical;
}

export default function Mapa() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [indicador, setIndicador] = useState<IndicadorMapa>("ideb2025");
  const [faixaMin, setFaixaMin] = useState<number | "">("");
  const [faixaMax, setFaixaMax] = useState<number | "">("");
  const { rows, loading } = useEtapaRows(etapa);

  const opcao = OPCOES.find((o) => o.key === indicador)!;

  const redeRows = useMemo(() => rows.filter((x) => x.rede === rede), [rows, rede]);
  const rankings = useMemo(() => computeRankings(redeRows, 2025), [redeRows]);

  const mapData = useMemo(() => {
    const m = new Map<string, MapDatum>();
    for (const r of redeRows) {
      const ideb2025 = valorNoAno(r, "ideb", 2025);
      if (faixaMin !== "" && (ideb2025 === null || ideb2025 < faixaMin)) continue;
      if (faixaMax !== "" && (ideb2025 === null || ideb2025 > faixaMax)) continue;
      const ideb2023 = valorNoAno(r, "ideb", 2023);
      const aprov2025 = valorNoAno(r, "aprov", 2025);
      const nm2025 = valorNoAno(r, "nm", 2025);
      const ultMeta = ultimoDisponivel(r, "meta");
      const obsNaMeta = ultMeta ? valorNoAno(r, "ideb", ultMeta.ano) : null;
      const diffMeta = ultMeta && obsNaMeta !== null ? obsNaMeta - ultMeta.valor : null;
      const crescimento = ideb2025 !== null && ideb2023 !== null ? ideb2025 - ideb2023 : null;
      const valores: Record<IndicadorMapa, number | null> = { ideb2025, crescimento, diffMeta, aprov2025, notaMedia2025: nm2025, statusMeta: diffMeta };
      const v = valores[indicador];
      const pos = rankings.get(r.codigo);
      m.set(r.codigo, {
        codigo: r.codigo,
        valor: v,
        cor: indicador === "statusMeta" && diffMeta !== null ? corStatusMeta(diffMeta) : undefined,
        tooltip: `<b>${r.nome} — ${r.uf}</b><br/>${etapa} · ${rede}
          <br/>IDEB 2025: ${fmtNum(ideb2025, 2)} · IDEB 2023: ${fmtNum(ideb2023, 2)}
          <br/>Variação: ${fmtDelta(crescimento, 2)}
          <br/>Meta (${ultMeta?.ano ?? "—"}): ${fmtNum(ultMeta?.valor ?? null, 2)} · Diferença: ${fmtDelta(diffMeta, 2)}
          ${pos ? `<br/>Posição no estado: ${pos.rankEstadual}º de ${pos.totalEstadual} · Posição no Brasil: ${pos.rankNacional}º de ${pos.totalNacional}` : ""}`,
      });
    }
    return m;
  }, [redeRows, rede, etapa, indicador, rankings, faixaMin, faixaMax]);

  return (
    <div>
      <h1 className="page-title">Mapa Interativo</h1>
      <p className="page-subtitle">Mapa coroplético nacional por código IBGE. Passe o mouse para ver o tooltip detalhado (com posição no estado e no Brasil); clique para abrir o perfil municipal.</p>

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
        <select value={indicador} onChange={(e) => setIndicador(e.target.value as IndicadorMapa)}>
          {OPCOES.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pill-label" style={{ marginLeft: 8 }}>
          Faixa de IDEB 2025:
        </span>
        <input type="number" step={0.1} placeholder="mín." value={faixaMin} onChange={(e) => setFaixaMin(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: 70 }} />
        <span className="muted">a</span>
        <input type="number" step={0.1} placeholder="máx." value={faixaMax} onChange={(e) => setFaixaMax(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: 70 }} />
        {(faixaMin !== "" || faixaMax !== "") && (
          <button
            className="btn"
            onClick={() => {
              setFaixaMin("");
              setFaixaMax("");
            }}
          >
            Limpar faixa
          </button>
        )}
        {loading && <span className="muted">carregando…</span>}
      </div>

      <div className="card">
        <MapView
          dados={mapData}
          onClickMunicipio={(cod) => navigate(`/municipio/${cod}`)}
          legendTitle={opcao.label}
          legendMin={opcao.min}
          legendMax={opcao.max}
          legendItems={indicador === "statusMeta" ? CLASSES_META : undefined}
          height={620}
        />
      </div>
    </div>
  );
}
