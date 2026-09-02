"""
ETL — Etapa 4: Validação

Executa checagens automáticas e grava audit/validacao.json. Nenhuma correção
é feita silenciosamente: tudo que for encontrado é apenas relatado.
"""
import json
import pandas as pd
from pathlib import Path

PROC_DIR = Path(__file__).resolve().parents[1] / "dados" / "processado"
AUDIT_DIR = Path(__file__).resolve().parents[1] / "audit"
GEO_DIR = Path(__file__).resolve().parents[1] / "dados" / "geometrias"

REFERENCIA_NACIONAL_2025 = {"Anos Iniciais": 6.222, "Anos Finais": 5.115, "Ensino Médio": 4.469}
MUNICIPIOS_IDEB10_REFERENCIA = ["Catunda", "Cruz", "Pires Ferreira", "Santana do Mundaú", "Coruripe"]


def main():
    fato = pd.read_parquet(PROC_DIR / "fato_ideb.parquet")
    dim_mun = pd.read_parquet(PROC_DIR / "dim_municipio.parquet")
    report = {}

    # 1) duplicidades: Código IBGE + Rede + Etapa + Ano + Indicador
    dup_key = ["co_municipio", "rede", "etapa", "ano", "indicador"]
    dup_counts = fato.groupby(dup_key).size()
    duplicados = dup_counts[dup_counts > 1]
    report["duplicidades"] = {
        "combinacoes_duplicadas": int(len(duplicados)),
        "exemplos": duplicados.reset_index().head(10).to_dict(orient="records") if len(duplicados) else [],
    }

    # 2) municípios / códigos IBGE
    report["municipios"] = {
        "total_distintos_uniao_3_arquivos": int(dim_mun["codigo_ibge"].nunique()),
        "codigos_ibge_invalidos_formato": int((~dim_mun["codigo_ibge"].astype(str).str.match(r"^\d{7}$")).sum()),
    }

    # 3) redes
    report["redes"] = sorted(fato["rede"].dropna().unique().tolist())

    # 4) anos por etapa
    report["anos_por_etapa"] = {
        etapa: sorted(int(a) for a in fato.loc[fato["etapa"] == etapa, "ano"].unique())
        for etapa in fato["etapa"].unique()
    }

    # 5) indicadores
    report["indicadores"] = sorted(fato["indicador"].dropna().unique().tolist())

    # 6) valores fora do intervalo esperado (IDEB e Meta: 0-10 ; Taxa de Aprovação/Indicador Rendimento: 0-1 ou 0-100 ; Notas SAEB: escala ~0-500)
    faixas = {
        "IDEB": (0, 10),
        "Meta IDEB": (0, 10),
        "Indicador de Rendimento": (0, 1.0001),
        "Taxa de Aprovação": (0, 100.0001),
        "Nota SAEB - Matemática": (0, 500),
        "Nota SAEB - Língua Portuguesa": (0, 500),
        "Nota Média Padronizada": (0, 10.0001),
    }
    fora_faixa = {}
    for ind, (lo, hi) in faixas.items():
        sub = fato[(fato["indicador"] == ind) & fato["valor"].notna()]
        bad = sub[(sub["valor"] < lo) | (sub["valor"] > hi)]
        fora_faixa[ind] = {"n_fora_da_faixa": int(len(bad)), "faixa_esperada": [lo, hi]}
    report["valores_fora_do_intervalo_esperado"] = fora_faixa

    # 7) municípios sem determinada rede (das 4 redes esperadas, quais estão ausentes por município+etapa)
    combos = fato[["co_municipio", "etapa", "rede"]].drop_duplicates()
    esperado = {"Municipal", "Estadual", "Federal", "Pública"}
    faltando = (
        combos.groupby(["co_municipio", "etapa"])["rede"].apply(lambda s: sorted(esperado - set(s)))
    )
    faltando = faltando[faltando.apply(len) > 0]
    report["municipios_sem_todas_as_redes"] = {
        "combinacoes_municipio_etapa_com_rede_faltante": int(len(faltando)),
        "observacao": "Uma rede pode legitimamente não existir num município (ex.: sem rede Federal ou Estadual atuando ali); não é erro, é reflexo da oferta educacional real.",
    }

    # 8) IDEB = 10 (Anos Iniciais/Finais/EM, qualquer rede/ano) — descoberto diretamente na base, não inserido manualmente
    ideb10 = fato[(fato["indicador"] == "IDEB") & (fato["valor"] == 10.0)].copy()
    ideb10["municipio"] = ideb10["nome_municipio"]
    lista_ideb10 = sorted(ideb10["municipio"].unique().tolist())
    report["municipios_ideb_10"] = {
        "registros_encontrados": int(len(ideb10)),
        "municipios_distintos": lista_ideb10,
        "detalhe": ideb10[["municipio", "uf", "rede", "etapa", "ano", "valor"]].sort_values(["municipio", "ano"]).to_dict(orient="records"),
        "referencia_validacao": MUNICIPIOS_IDEB10_REFERENCIA,
        "todos_da_referencia_encontrados": all(m in lista_ideb10 for m in MUNICIPIOS_IDEB10_REFERENCIA),
    }

    # 9) validação nacional 2025 (rede Pública) vs valor de divulgação oficial
    validacao_nacional = {}
    for etapa, ref in REFERENCIA_NACIONAL_2025.items():
        sub = fato[(fato["etapa"] == etapa) & (fato["indicador"] == "IDEB") & (fato["ano"] == 2025) & (fato["rede"] == "Pública") & fato["valor"].notna()]
        media_simples = float(sub["valor"].mean()) if len(sub) else None
        validacao_nacional[etapa] = {
            "media_simples_municipios_rede_publica_2025": round(media_simples, 3) if media_simples else None,
            "n_municipios_considerados": int(len(sub)),
            "valor_referencia_divulgacao_oficial": ref,
            "observacao": "Média simples do IDEB 2025 (rede Pública) entre os municípios com dado disponível, calculada apenas para checagem de integração dos três arquivos contra o valor nacional divulgado pelo INEP.",
        }
    report["validacao_nacional_2025"] = validacao_nacional

    # 10) consistência entre arquivos: municípios presentes em AI mas ausentes em AF, e vice-versa
    muns_ai = set(fato.loc[fato["etapa"] == "Anos Iniciais", "co_municipio"].unique())
    muns_af = set(fato.loc[fato["etapa"] == "Anos Finais", "co_municipio"].unique())
    muns_em = set(fato.loc[fato["etapa"] == "Ensino Médio", "co_municipio"].unique())
    report["consistencia_entre_arquivos"] = {
        "em_AI_nao_em_AF": len(muns_ai - muns_af),
        "em_AF_nao_em_AI": len(muns_af - muns_ai),
        "em_AI_ou_AF_nao_em_EM": len((muns_ai | muns_af) - muns_em),
    }

    # 11) cobertura de geometria (mapa)
    try:
        import subprocess
        geo_path = GEO_DIR / "municipios_br.topojson"
        with open(geo_path, encoding="utf-8") as f:
            topo = json.load(f)
        obj = list(topo["objects"].values())[0]
        geo_ids = {int(g["properties"]["id"]) for g in obj["geometries"]}
        report["cobertura_geometria_mapa"] = {
            "municipios_com_geometria": len(geo_ids),
            "municipios_dados_sem_geometria": sorted(int(c) for c in (set(dim_mun["codigo_ibge"]) - geo_ids))[:50],
            "total_municipios_dados_sem_geometria": len(set(dim_mun["codigo_ibge"]) - geo_ids),
        }
    except Exception as e:
        report["cobertura_geometria_mapa"] = {"erro": str(e)}

    with open(AUDIT_DIR / "validacao.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)

    print(f"Duplicidades: {report['duplicidades']['combinacoes_duplicadas']}")
    print(f"Municípios (união 3 arquivos): {report['municipios']['total_distintos_uniao_3_arquivos']}")
    print(f"Municípios com IDEB=10 (algum ano/rede/etapa): {len(lista_ideb10)} -> {lista_ideb10[:10]}...")
    print(f"Referência (Catunda, Cruz, Pires Ferreira, Santana do Mundaú, Coruripe) todos encontrados: {report['municipios_ideb_10']['todos_da_referencia_encontrados']}")
    print("Validação nacional 2025:", json.dumps(validacao_nacional, ensure_ascii=False, indent=2))
    print("Cobertura geometria:", report["cobertura_geometria_mapa"].get("municipios_com_geometria"), "/", len(dim_mun))
    print("Relatório completo salvo em audit/validacao.json")


if __name__ == "__main__":
    main()
