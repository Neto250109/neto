import { useDataStore } from "../lib/dataStore";
import { ETAPAS } from "../types";
import { fmtInt } from "../lib/format";

export default function Metodologia() {
  const { meta } = useDataStore();
  return (
    <div style={{ maxWidth: 880 }}>
      <h1 className="page-title">Metodologia</h1>
      <p className="page-subtitle">Fontes, tratamento dos dados, modelagem, indicadores e limitações deste painel.</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Sobre os dados</h3>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, fontSize: 13 }}>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Fonte</div>
            <div>INEP/MEC — IDEB 2025</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Unidade espacial</div>
            <div>Município</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Município mais recente</div>
            <div>2025</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Número de municípios</div>
            <div className="tabular">{meta ? fmtInt(meta.total_municipios) : "—"}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Etapas</div>
            <div>{ETAPAS.join(" · ")}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: 11 }}>Data de geração dos dados</div>
            <div>{meta ? new Date(meta.gerado_em).toLocaleString("pt-BR") : "—"}</div>
          </div>
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>
          <b>Critérios de exclusão:</b> nenhum município é excluído do painel. Um município sem determinada rede, etapa ou ano simplesmente não possui dado
          disponível naquela combinação — a ausência é sempre exibida como tal ("Não avaliado" / "Não divulgado"), nunca omitida ou tratada como zero.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Fonte</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira — INEP/MEC. Divulgação do IDEB 2025, arquivos oficiais por município:
        </p>
        <ul style={{ fontSize: 13.5, lineHeight: 1.8 }}>
          <li><code>divulgacao_anos_iniciais_municipios_2025.xlsx</code> — Anos Iniciais do Ensino Fundamental (série histórica 2005–2025)</li>
          <li><code>divulgacao_anos_finais_municipios_2025.xlsx</code> — Anos Finais do Ensino Fundamental (série histórica 2005–2025)</li>
          <li><code>divulgacao_ensino_medio_municipios_2025.xlsx</code> — Ensino Médio (série histórica 2017–2025)</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>ETL — extração e tratamento</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          Cada arquivo original possui 4 linhas de cabeçalho mescladas. A 5ª linha traz os nomes técnicos padronizados do INEP (ex.: <code>VL_OBSERVADO_2025</code>, <code>VL_APROVACAO_2023_SI_4</code>),
          usados como chave programática para reconstruir a estrutura — nenhum nome de coluna foi inferido manualmente. Os dados começam na 6ª linha, uma linha por combinação Município + Rede.
        </p>
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>Regras de conversão de valores (nenhuma aplicada silenciosamente):</p>
        <ul style={{ fontSize: 13.5, lineHeight: 1.8 }}>
          <li>Número com vírgula decimal (ex.: <code>6,22</code>) → convertido para <code>6.22</code>, status <b>Disponível</b>.</li>
          <li>Valor terminado em <code>*</code> (nota de rodapé metodológica do INEP) → convertido normalmente, sinalizado internamente como <i>nota_metodologica</i>.</li>
          <li><code>-</code> → status <b>Não avaliado</b> (etapa/rede sem avaliação), valor nulo — nunca zero.</li>
          <li><code>ND</code> / <code>ND*</code> / <code>ND***</code> → status <b>Não divulgado</b> (sigilo estatístico do INEP), valor nulo — nunca zero.</li>
          <li>Célula vazia → status <b>Ausente</b>, valor nulo.</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Modelo estrela</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          <b>Fato_IDEB</b>: Município · Rede · Etapa · Ano · Indicador · Valor · Status (granularidade original preservada, sem agregações no fato).<br />
          <b>Dim_Município</b>: código IBGE, nome, UF, Região (Região derivada da divisão oficial do IBGE em 5 regiões a partir da UF — classificação de referência, não um dado estimado).<br />
          <b>Dim_Rede</b>: Municipal, Estadual, Federal, Pública. A rede <b>Pública</b> é tratada como agregado (Municipal + Estadual + Federal) e nunca somada novamente às demais em totais.<br />
          <b>Dim_Etapa</b>: Anos Iniciais, Anos Finais, Ensino Médio.<br />
          <b>Dim_Tempo</b>: anos 2005–2025 (bienal), com primeiro/último ano por etapa.<br />
          <b>Dim_Indicador</b>: IDEB, Meta IDEB, Taxa de Aprovação, Indicador de Rendimento, Nota SAEB (Matemática/Português), Nota Média Padronizada.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Fórmulas e indicadores derivados</h3>
        <ul style={{ fontSize: 13.5, lineHeight: 1.9 }}>
          <li>IDEB = Indicador de Rendimento × Nota Média Padronizada (metodologia oficial INEP).</li>
          <li>Variação absoluta = IDEB(ano final) − IDEB(ano inicial).</li>
          <li>Variação percentual = ((IDEB(ano final) / IDEB(ano inicial)) − 1) × 100.</li>
          <li>Diferença para a meta = IDEB observado − Meta (comparados no mesmo ano de referência da meta).</li>
          <li>Classificação de desempenho (Muito alto/Alto/Médio/Baixo/Muito baixo): por quartis, calculada dinamicamente sobre o conjunto filtrado.</li>
          <li>Classificação de evolução (Forte crescimento/Crescimento/Estabilidade/Queda/Forte queda): limites parametrizáveis pelo usuário na página Evolução.</li>
          <li>Todos os indicadores derivados acima são <b>calculados pelo BI</b> a partir dos dados oficiais — nunca substituem ou reescrevem o dado original do INEP.</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Limitações e regras para dados ausentes</h3>
        <ul style={{ fontSize: 13.5, lineHeight: 1.8 }}>
          <li>Nenhum valor ausente, não avaliado ou não divulgado é tratado como zero.</li>
          <li>Médias e estatísticas excluem sempre os municípios sem dado disponível; o número de observações (N) é exibido junto a cada média.</li>
          <li>As Metas do 1º ciclo do IDEB estão disponíveis apenas até 2021 (2019 e 2021 no Ensino Médio); não há meta oficial publicada para 2023/2025 nestes arquivos — nenhum valor é estimado para preencher essa lacuna.</li>
          <li>A geometria municipal usada no mapa é uma malha simplificada de referência pública (códigos IBGE); um pequeno número de municípios recentes pode não ter geometria correspondente — nesses casos o mapa exibe "sem geometria disponível" em vez de omitir o dado.</li>
          <li>Municípios com IDEB = 10 são identificados automaticamente na base (nunca inseridos manualmente) — ver página Ranking e Qualidade dos Dados.</li>
        </ul>
      </div>

      <div className="card">
        <h3>Atualização</h3>
        <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          Para atualizar este painel com uma nova divulgação do IDEB: substituir os três arquivos em <code>dados/bruto/</code>, executar em sequência os scripts <code>scripts/01_importacao.py</code> →{" "}
          <code>02_limpeza.py</code> → <code>03_transformacao.py</code> → <code>04_validacao.py</code> → <code>05_exportacao.py</code>, revisar o relatório em <code>audit/validacao.json</code> e
          reimplantar o diretório <code>web/</code>. Nenhuma etapa altera os arquivos originais do INEP.
        </p>
      </div>
    </div>
  );
}
