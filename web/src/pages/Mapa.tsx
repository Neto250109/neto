import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEtapaRows, valorNoAno, ultimoDisponivel } from "../lib/useEtapaRows";
import type { Etapa, Rede } from "../types";
import { ETAPAS, REDES } from "../types";
import MapView, { type MapDatum } from "../components/MapView";
import { fmtDelta, fmtNum } from "../lib/format";

type IndicadorMapa = "ideb2025" | "crescimento" | "diffMeta" | "aprov2025" | "notaMedia2025";
const OPCOES: { key: IndicadorMapa; label: string; min: number; max: number }[] = [
  { key: "ideb2025", label: "IDEB 2025", min: 0, max: 10 },
  { key: "crescimento", label: "Crescimento 2023→2025", min: -2, max: 2 },
  { key: "diffMeta", label: "Diferença para a meta", min: -3, max: 3 },
  { key: "aprov2025", label: "Taxa de Aprovação 2025 (%)", min: 0, max: 100 },
  { key: "notaMedia2025", label: "Nota Média Padronizada 2025", min: 0, max: 10 },
];

export default function Mapa() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>("Anos Iniciais");
  const [rede, setRede] = useState<Rede>("Pública");
  const [indicador, setIndicador] = useState<IndicadorMapa>("ideb2025");
  const { rows, loading } = useEtapaRows(etapa);

  const opcao = OPCOES.find((o) => o.key === indicador)!;

  const mapData = useMemo(() => {
    const m = new Map<string, MapDatum>();
    for (const r of rows.filter((x) => x.rede === rede)) {
      const ideb2025 = valorNoAno(r, "ideb", 2025);
      const ideb2023 = valorNoAno(r, "ideb", 2023);
      const aprov2025 = valorNoAno(r, "aprov", 2025);
      const nm2025 = valorNoAno(r, "nm", 2025);
      const ultMeta = ultimoDisponivel(r, "meta");
      const obsNaMeta = ultMeta ? valorNoAno(r, "ideb", ultMeta.ano) : null;
      const diffMeta = ultMeta && obsNaMeta !== null ? obsNaMeta - ultMeta.valor : null;
      const crescimento = ideb2025 !== null && ideb2023 !== null ? ideb2025 - ideb2023 : null;
      const valores: Record<IndicadorMapa, number | null> = { ideb2025, crescimento, diffMeta, aprov2025, notaMedia2025: nm2025 };
      const v = valores[indicador];
      m.set(r.codigo, {
        codigo: r.codigo,
        valor: v,
        tooltip: `<b>${r.nome} — ${r.uf}</b><br/>${etapa} · ${rede}
          <br/>IDEB 2025: ${fmtNum(ideb2025, 2)} · IDEB 2023: ${fmtNum(ideb2023, 2)}
          <br/>Variação: ${fmtDelta(crescimento, 2)}
          <br/>Meta (${ultMeta?.ano ?? "—"}): ${fmtNum(ultMeta?.valor ?? null, 2)} · Diferença: ${fmtDelta(diffMeta, 2)}`,
      });
    }
    return m;
  }, [rows, rede, etapa, indicador]);

  return (
    <div>
      <h1 className="page-title">Mapa Interativo</h1>
      <p className="page-subtitle">Mapa coroplético nacional por código IBGE. Passe o mouse para ver o tooltip detalhado; clique para abrir o perfil municipal.</p>

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
        <select value={indicador} onChange={(e) => setIndicador(e.target.value as IndicadorMapa)}>
          {OPCOES.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        {loading && <span className="muted">carregando…</span>}
      </div>

      <div className="card">
        <MapView dados={mapData} onClickMunicipio={(cod) => navigate(`/municipio/${cod}`)} legendTitle={opcao.label} legendMin={opcao.min} legendMax={opcao.max} height={620} />
      </div>
    </div>
  );
}
