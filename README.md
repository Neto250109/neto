# IDEB 2025 — Painel Nacional Municipal

BI educacional interativo, analítico, geográfico e temporal sobre o **IDEB 2025**, construído
exclusivamente a partir dos três arquivos oficiais de divulgação do **INEP/MEC** por município:
Anos Iniciais, Anos Finais do Ensino Fundamental e Ensino Médio.

> **Fonte:** Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira — INEP/MEC.
> Divulgação do IDEB 2025.

## Objetivo

Permitir a análise do desempenho educacional dos municípios brasileiros ao longo da série
histórica disponível (2005–2025), com comparações territoriais, temporais, entre etapas de
ensino e entre redes de ensino, além de análises de evolução, desigualdade, desempenho, metas
e distribuição espacial — sem necessidade de manipulação manual dos arquivos originais.

**Princípio fundamental: nenhum dado é inventado.** Valores ausentes ("-"), não divulgados
("ND") e sem cobertura de meta permanecem explicitamente marcados como tais em toda a
aplicação — nunca são convertidos para zero ou estimados.

## Estrutura do projeto

```
neto/
├── dados/
│   ├── bruto/            # xlsx originais do INEP (não versionados — ver "Como atualizar")
│   ├── processado/        # parquet intermediários do ETL (não versionados, regeneráveis)
│   └── geometrias/         # malha municipal simplificada (topojson) usada no mapa
│
├── scripts/                       # ETL, em Python (pandas + openpyxl)
│   ├── 01_importacao.py            # extrai os 3 xlsx (cabeçalho de 4 linhas) -> parquet "long"
│   ├── 02_limpeza.py               # trata vírgula decimal, "-", "ND", "*", classifica status
│   ├── 03_transformacao.py         # modelo estrela: Fato_IDEB + Dim_Município/Rede/Etapa/Tempo/Indicador
│   ├── 04_validacao.py             # duplicidades, IDEB=10, validação nacional, cobertura de geometria
│   └── 05_exportacao.py            # gera os JSON/CSV compactos consumidos pelo BI web
│
├── audit/                          # relatórios da auditoria automática (JSON)
│
└── web/                            # aplicação React + TypeScript + Vite (o BI propriamente dito)
    ├── public/data/                 # dados compactos servidos estaticamente (municípios, séries, mapa)
    ├── public/downloads/             # CSVs completos por etapa, para download
    └── src/
        ├── pages/                    # as ~19 páginas do painel
        ├── components/                 # KPIs, tabelas, gráficos (ECharts), mapa (MapLibre GL)
        └── lib/                        # data store, filtros, estatística, formatação, export CSV
```

## Como executar o ETL

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install pandas openpyxl pyarrow

# coloque os 3 arquivos oficiais em dados/bruto/ com os nomes:
#   divulgacao_anos_iniciais_municipios_2025.xlsx
#   divulgacao_anos_finais_municipios_2025.xlsx
#   divulgacao_ensino_medio_municipios_2025.xlsx

python3 scripts/01_importacao.py
python3 scripts/02_limpeza.py
python3 scripts/03_transformacao.py
python3 scripts/04_validacao.py    # revise audit/validacao.json
python3 scripts/05_exportacao.py   # grava web/public/data e web/public/downloads
```

A geometria municipal (`dados/geometrias/municipios_br.topojson`) é gerada uma única vez a
partir de uma malha pública de referência (códigos IBGE), simplificada com `mapshaper`:

```bash
npx mapshaper <malha_municipal.geojson> -simplify dp 10% keep-shapes \
  -o format=topojson quantization=1e5 dados/geometrias/municipios_br.topojson
```

## Como executar o BI web

```bash
cd web
npm install
npm run dev       # desenvolvimento
npm run build     # build de produção em web/dist
npm run preview   # servir o build localmente
```

## Metodologia, fórmulas e limitações

Ver a página **Metodologia** dentro do próprio painel (`/#/metodologia`), que documenta:
regras de tratamento de valores, modelo estrela, fórmulas dos indicadores derivados,
regras para dados ausentes e o procedimento de atualização. A página **Qualidade dos Dados**
(`/#/qualidade`) expõe o relatório de auditoria em tempo real (cobertura, duplicidades,
municípios com IDEB=10 encontrados automaticamente na base, validação contra os valores
nacionais oficiais de divulgação).

## Tecnologia

- **ETL:** Python, pandas, openpyxl, pyarrow (parquet).
- **Frontend:** React + TypeScript + Vite, Apache ECharts (gráficos), MapLibre GL JS + TopoJSON
  (mapa coroplético), Zustand (estado/filtros), React Router (`HashRouter`, compatível com
  qualquer hospedagem estática sem configuração de rewrite).
- **Dados:** arquivos JSON/CSV estáticos pré-agregados pelo ETL — não há backend/servidor;
  toda a interatividade (filtros cruzados, ordenação, exportação) roda no navegador.

## Não invenção de dados

Nenhum valor de IDEB, meta, aprovação, nota SAEB ou classificação territorial é estimado.
Toda variável derivada (variação, classificação de desempenho/evolução, diferença para a
meta, estatísticas descritivas) é calculada a partir dos dados oficiais e identificada como
tal na metodologia — nunca substitui ou sobrescreve o dado original do INEP.
