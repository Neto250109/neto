import { useEffect, useState } from "react";
import { fmtInt, fmtPct } from "../lib/format";

interface QualidadeValores {
  [etapa: string]: { registros: number; status_contagem: Record<string, number>; percentual_disponivel: number; registros_com_nota_metodologica: number };
}
interface Validacao {
  duplicidades: { combinacoes_duplicadas: number };
  municipios: { total_distintos_uniao_3_arquivos: number; codigos_ibge_invalidos_formato: number };
  redes: string[];
  anos_por_etapa: Record<string, number[]>;
  indicadores: string[];
  valores_fora_do_intervalo_esperado: Record<string, { n_fora_da_faixa: number; faixa_esperada: [number, number] }>;
  municipios_sem_todas_as_redes: { combinacoes_municipio_etapa_com_rede_faltante: number; observacao: string };
  municipios_ideb_10: { registros_encontrados: number; municipios_distintos: string[]; referencia_validacao: string[]; todos_da_referencia_encontrados: boolean };
  validacao_nacional_2025: Record<string, { media_simples_municipios_rede_publica_2025: number | null; n_municipios_considerados: number; valor_referencia_divulgacao_oficial: number }>;
  consistencia_entre_arquivos: Record<string, number>;
  cobertura_geometria_mapa: { municipios_com_geometria: number; total_municipios_dados_sem_geometria: number };
}
interface Catalogo {
  [etapa: string]: { arquivo_origem: string; linhas_dados_lidas: number; registros_long: number; municipios_distintos: number };
}

export default function Qualidade() {
  const [qv, setQv] = useState<QualidadeValores | null>(null);
  const [val, setVal] = useState<Validacao | null>(null);
  const [cat, setCat] = useState<Catalogo | null>(null);

  useEffect(() => {
    const base = `${import.meta.env.BASE_URL}data/audit`;
    Promise.all([fetch(`${base}/qualidade_valores.json`).then((r) => r.json()), fetch(`${base}/validacao.json`).then((r) => r.json()), fetch(`${base}/catalogo_fontes.json`).then((r) => r.json())]).then(
      ([q, v, c]) => {
        setQv(q);
        setVal(v);
        setCat(c);
      },
    );
  }, []);

  if (!qv || !val || !cat) return <p className="muted">Carregando relatório de qualidade…</p>;

  return (
    <div>
      <h1 className="page-title">Qualidade e Cobertura dos Dados</h1>
      <p className="page-subtitle">Auditoria automática executada sobre os três arquivos oficiais do INEP. Nenhuma correção é feita silenciosamente.</p>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        {Object.entries(qv).map(([etapa, r]) => (
          <div key={etapa} className="card">
            <h3>{etapa}</h3>
            <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>Registros (long)</div>
                <div className="tabular" style={{ fontSize: 20, fontWeight: 700 }}>{fmtInt(r.registros)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12 }}>% Disponível</div>
                <div className="tabular" style={{ fontSize: 20, fontWeight: 700, color: "var(--success-text)" }}>{fmtPct(r.percentual_disponivel, 1)}</div>
              </div>
            </div>
            <table style={{ marginTop: 10 }}>
              <tbody>
                {Object.entries(r.status_contagem).map(([status, n]) => (
                  <tr key={status}>
                    <td>{status}</td>
                    <td className="tabular" style={{ textAlign: "right" }}>
                      {fmtInt(n)}
                    </td>
                    <td className="tabular muted" style={{ textAlign: "right" }}>
                      {fmtPct((n / r.registros) * 100, 1)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>com nota metodológica (*)</td>
                  <td className="tabular" style={{ textAlign: "right" }}>
                    {fmtInt(r.registros_com_nota_metodologica)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Integridade estrutural</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6, fontSize: 13.5 }}>
            <li>Combinações duplicadas (IBGE+Rede+Etapa+Ano+Indicador): <b className="tabular">{fmtInt(val.duplicidades.combinacoes_duplicadas)}</b></li>
            <li>Municípios distintos (união dos 3 arquivos): <b className="tabular">{fmtInt(val.municipios.total_distintos_uniao_3_arquivos)}</b></li>
            <li>Códigos IBGE com formato inválido: <b className="tabular">{fmtInt(val.municipios.codigos_ibge_invalidos_formato)}</b></li>
            <li>Redes identificadas: <b>{val.redes.join(", ")}</b></li>
            <li>Combinações Município+Etapa com alguma rede não presente: <b className="tabular">{fmtInt(val.municipios_sem_todas_as_redes.combinacoes_municipio_etapa_com_rede_faltante)}</b></li>
            <li>Cobertura de geometria (mapa): <b className="tabular">{fmtInt(val.cobertura_geometria_mapa.municipios_com_geometria)}</b> municípios com polígono ({fmtInt(val.cobertura_geometria_mapa.total_municipios_dados_sem_geometria)} sem geometria disponível)</li>
          </ul>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 10 }}>{val.municipios_sem_todas_as_redes.observacao}</p>
        </div>
        <div className="card">
          <h3>Valores fora do intervalo esperado</h3>
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th style={{ textAlign: "right" }}>Faixa esperada</th>
                <th style={{ textAlign: "right" }}>Ocorrências fora</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(val.valores_fora_do_intervalo_esperado).map(([ind, r]) => (
                <tr key={ind}>
                  <td>{ind}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>
                    [{r.faixa_esperada[0]}, {r.faixa_esperada[1]}]
                  </td>
                  <td className="tabular" style={{ textAlign: "right", color: r.n_fora_da_faixa > 0 ? "var(--status-critical)" : undefined }}>
                    {fmtInt(r.n_fora_da_faixa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid chart-grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Validação nacional 2025 (rede Pública)</h3>
          <table>
            <thead>
              <tr>
                <th>Etapa</th>
                <th style={{ textAlign: "right" }}>Média simples</th>
                <th style={{ textAlign: "right" }}>Referência oficial</th>
                <th style={{ textAlign: "right" }}>N</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(val.validacao_nacional_2025).map(([etapa, r]) => (
                <tr key={etapa}>
                  <td>{etapa}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>{r.media_simples_municipios_rede_publica_2025}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>{r.valor_referencia_divulgacao_oficial}</td>
                  <td className="tabular" style={{ textAlign: "right" }}>{fmtInt(r.n_municipios_considerados)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Desempenho Máximo — IDEB = 10 (auditoria)</h3>
          <p style={{ fontSize: 13.5 }}>
            <b className="tabular">{val.municipios_ideb_10.municipios_distintos.length}</b> município(s) distinto(s) com algum registro IDEB = 10 encontrados diretamente na base.
          </p>
          <p className="muted" style={{ fontSize: 12 }}>{val.municipios_ideb_10.municipios_distintos.join(", ")}</p>
          <p style={{ fontSize: 12.5, marginTop: 8 }}>
            Todos os municípios de referência (Catunda, Cruz, Pires Ferreira, Santana do Mundaú, Coruripe) encontrados:{" "}
            <b style={{ color: val.municipios_ideb_10.todos_da_referencia_encontrados ? "var(--success-text)" : "var(--status-critical)" }}>
              {val.municipios_ideb_10.todos_da_referencia_encontrados ? "sim" : "não"}
            </b>
          </p>
        </div>
      </div>

      <div className="card">
        <h3>Catálogo das fontes originais</h3>
        <table>
          <thead>
            <tr>
              <th>Etapa</th>
              <th>Arquivo</th>
              <th style={{ textAlign: "right" }}>Linhas lidas</th>
              <th style={{ textAlign: "right" }}>Registros (long)</th>
              <th style={{ textAlign: "right" }}>Municípios</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(cat).map(([etapa, r]) => (
              <tr key={etapa}>
                <td>{etapa}</td>
                <td>{r.arquivo_origem}</td>
                <td className="tabular" style={{ textAlign: "right" }}>{fmtInt(r.linhas_dados_lidas)}</td>
                <td className="tabular" style={{ textAlign: "right" }}>{fmtInt(r.registros_long)}</td>
                <td className="tabular" style={{ textAlign: "right" }}>{fmtInt(r.municipios_distintos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
