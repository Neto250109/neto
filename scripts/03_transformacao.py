"""
ETL — Etapa 3: Modelagem em esquema estrela

Gera:
  Dim_Municipio  (Código IBGE, Município, UF, Região)
  Dim_Rede       (Municipal, Estadual, Federal, Pública)
  Dim_Etapa      (Anos Iniciais, Anos Finais, Ensino Médio)
  Dim_Tempo      (Ano, período do ciclo do Ideb, ordem temporal)
  Dim_Indicador  (classificação dos indicadores)
  Fato_IDEB      (união das 3 etapas já limpas, granularidade Município+Rede+Etapa+Ano+Indicador)

Região é derivada da UF a partir da divisão oficial do IBGE em 5 regiões
(Norte, Nordeste, Sudeste, Sul, Centro-Oeste) — trata-se de uma
classificação de referência pública e estável do IBGE, não de um valor
estimado; é aplicada apenas para permitir agregações territoriais, nunca
para alterar os dados originais do INEP.
"""
import json
import pandas as pd
from pathlib import Path

PROC_DIR = Path(__file__).resolve().parents[1] / "dados" / "processado"
AUDIT_DIR = Path(__file__).resolve().parents[1] / "audit"

SLUGS = {"Anos Iniciais": "anos_iniciais", "Anos Finais": "anos_finais", "Ensino Médio": "ensino_medio"}

UF_REGIAO = {
    "RO": "Norte", "AC": "Norte", "AM": "Norte", "RR": "Norte", "PA": "Norte", "AP": "Norte", "TO": "Norte",
    "MA": "Nordeste", "PI": "Nordeste", "CE": "Nordeste", "RN": "Nordeste", "PB": "Nordeste", "PE": "Nordeste",
    "AL": "Nordeste", "SE": "Nordeste", "BA": "Nordeste",
    "MG": "Sudeste", "ES": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "SC": "Sul", "RS": "Sul",
    "MS": "Centro-Oeste", "MT": "Centro-Oeste", "GO": "Centro-Oeste", "DF": "Centro-Oeste",
}

UF_NOME = {
    "RO": "Rondônia", "AC": "Acre", "AM": "Amazonas", "RR": "Roraima", "PA": "Pará", "AP": "Amapá", "TO": "Tocantins",
    "MA": "Maranhão", "PI": "Piauí", "CE": "Ceará", "RN": "Rio Grande do Norte", "PB": "Paraíba", "PE": "Pernambuco",
    "AL": "Alagoas", "SE": "Sergipe", "BA": "Bahia",
    "MG": "Minas Gerais", "ES": "Espírito Santo", "RJ": "Rio de Janeiro", "SP": "São Paulo",
    "PR": "Paraná", "SC": "Santa Catarina", "RS": "Rio Grande do Sul",
    "MS": "Mato Grosso do Sul", "MT": "Mato Grosso", "GO": "Goiás", "DF": "Distrito Federal",
}

INDICADOR_GRUPO_CLASSIFICACAO = {
    "Taxa de Aprovação": "Rendimento",
    "Indicador de Rendimento": "Rendimento",
    "Nota SAEB - Matemática": "Desempenho SAEB",
    "Nota SAEB - Língua Portuguesa": "Desempenho SAEB",
    "Nota Média Padronizada": "Desempenho SAEB",
    "IDEB": "Resultado",
    "Meta IDEB": "Meta",
}


def build_fato():
    dfs = []
    for etapa, slug in SLUGS.items():
        d = pd.read_parquet(PROC_DIR / f"clean_{slug}.parquet")
        dfs.append(d)
    fato = pd.concat(dfs, ignore_index=True)
    fato["regiao"] = fato["uf"].map(UF_REGIAO)
    fato.to_parquet(PROC_DIR / "fato_ideb.parquet", index=False)
    return fato


def build_dim_municipio(fato: pd.DataFrame):
    dim = (
        fato[["co_municipio", "nome_municipio", "uf"]]
        .drop_duplicates(subset=["co_municipio"])
        .rename(columns={"co_municipio": "codigo_ibge", "nome_municipio": "municipio"})
    )
    dim["regiao"] = dim["uf"].map(UF_REGIAO)
    dim["uf_nome"] = dim["uf"].map(UF_NOME)
    dim = dim.sort_values("codigo_ibge").reset_index(drop=True)
    dim.to_parquet(PROC_DIR / "dim_municipio.parquet", index=False)
    return dim


def build_dim_rede():
    dim = pd.DataFrame({
        "rede": ["Municipal", "Estadual", "Federal", "Pública"],
        "tipo": ["Específica", "Específica", "Específica", "Agregado (Municipal+Estadual+Federal)"],
        "somar_em_totais": [True, True, True, False],
    })
    dim.to_parquet(PROC_DIR / "dim_rede.parquet", index=False)
    return dim


def build_dim_etapa(fato: pd.DataFrame):
    rows = []
    for etapa in ["Anos Iniciais", "Anos Finais", "Ensino Médio"]:
        sub = fato[fato["etapa"] == etapa]
        rows.append({
            "etapa": etapa,
            "primeiro_ano_disponivel": int(sub["ano"].min()),
            "ultimo_ano_disponivel": int(sub["ano"].max()),
        })
    dim = pd.DataFrame(rows)
    dim.to_parquet(PROC_DIR / "dim_etapa.parquet", index=False)
    return dim


def build_dim_tempo(fato: pd.DataFrame):
    anos = sorted(fato["ano"].dropna().unique().tolist())
    dim = pd.DataFrame({"ano": [int(a) for a in anos]})
    dim["ordem"] = range(1, len(dim) + 1)
    dim["primeiro_ano"] = dim["ano"] == dim["ano"].min()
    dim["ultimo_ano"] = dim["ano"] == dim["ano"].max()
    dim.to_parquet(PROC_DIR / "dim_tempo.parquet", index=False)
    return dim


def build_dim_indicador(fato: pd.DataFrame):
    indicadores = sorted(fato["indicador"].dropna().unique().tolist())
    dim = pd.DataFrame({"indicador": indicadores})
    dim["grupo"] = dim["indicador"].map(INDICADOR_GRUPO_CLASSIFICACAO)
    dim.to_parquet(PROC_DIR / "dim_indicador.parquet", index=False)
    return dim


def main():
    fato = build_fato()
    dim_mun = build_dim_municipio(fato)
    dim_rede = build_dim_rede()
    dim_etapa = build_dim_etapa(fato)
    dim_tempo = build_dim_tempo(fato)
    dim_ind = build_dim_indicador(fato)

    resumo = {
        "fato_ideb_registros": len(fato),
        "dim_municipio_linhas": len(dim_mun),
        "dim_rede_linhas": len(dim_rede),
        "dim_etapa": dim_etapa.to_dict(orient="records"),
        "dim_tempo_anos": dim_tempo["ano"].tolist(),
        "dim_indicador_linhas": dim_ind.to_dict(orient="records"),
        "municipios_sem_regiao_mapeada": int(dim_mun["regiao"].isna().sum()),
    }
    with open(AUDIT_DIR / "modelo_estrela.json", "w", encoding="utf-8") as f:
        json.dump(resumo, f, ensure_ascii=False, indent=2, default=str)
    print(json.dumps(resumo, ensure_ascii=False, indent=2, default=str))


if __name__ == "__main__":
    main()
