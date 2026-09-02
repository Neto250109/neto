"""
ETL — Etapa 5: Exportação

Gera os arquivos de dados compactos que alimentam o BI web (public/data/*)
e as planilhas de download (public/downloads/*), a partir do Fato_IDEB e
das dimensões já validadas. Nenhum dado é inventado: valores ausentes
seguem como null (nunca 0) e o número de observações usadas em cada média
é sempre registrado.
"""
import json
import shutil
import pandas as pd
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROC_DIR = ROOT / "dados" / "processado"
AUDIT_DIR = ROOT / "audit"
GEO_DIR = ROOT / "dados" / "geometrias"
WEB_DATA = ROOT / "web" / "public" / "data"
WEB_DOWNLOADS = ROOT / "web" / "public" / "downloads"
WEB_DATA.mkdir(parents=True, exist_ok=True)
WEB_DOWNLOADS.mkdir(parents=True, exist_ok=True)

SLUGS = {"Anos Iniciais": "anos_iniciais", "Anos Finais": "anos_finais", "Ensino Médio": "ensino_medio"}
INDICADOR_KEY = {
    "IDEB": "ideb",
    "Meta IDEB": "meta",
    "Taxa de Aprovação": "aprov",
    "Indicador de Rendimento": "rend",
    "Nota SAEB - Matemática": "mat",
    "Nota SAEB - Língua Portuguesa": "port",
    "Nota Média Padronizada": "nm",
}
REDES = ["Pública", "Municipal", "Estadual", "Federal"]


def clean_num(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return round(float(v), 4)


def export_municipios(dim_mun: pd.DataFrame):
    registros = {}
    for r in dim_mun.itertuples():
        registros[str(r.codigo_ibge)] = {"nome": r.municipio, "uf": r.uf, "uf_nome": r.uf_nome, "regiao": r.regiao}
    with open(WEB_DATA / "municipios.json", "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, separators=(",", ":"))
    return registros


def export_etapa_municipal(etapa: str, fato: pd.DataFrame, anos: list):
    sub = fato[fato["etapa"] == etapa]
    wide = sub.pivot_table(index=["co_municipio", "rede", "ano"], columns="indicador", values="valor", aggfunc="first")
    wide = wide.reset_index()

    out = {}
    for co_mun, g in wide.groupby("co_municipio"):
        mun_key = str(int(co_mun))
        redes_obj = {}
        for rede, gr in g.groupby("rede"):
            gr = gr.set_index("ano")
            serie = {}
            for label, key in INDICADOR_KEY.items():
                if label not in gr.columns:
                    continue
                arr = [clean_num(gr[label].get(a, np.nan)) for a in anos]
                if any(v is not None for v in arr):
                    serie[key] = arr
            if serie:
                redes_obj[rede] = serie
        if redes_obj:
            out[mun_key] = redes_obj

    slug = SLUGS[etapa]
    with open(WEB_DATA / f"dados_{slug}.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    # download CSV (formato largo, uma linha por município+rede+ano)
    wide_named = wide.rename(columns=INDICADOR_KEY)
    csv_path = WEB_DOWNLOADS / f"ideb_{slug}_municipios.csv"
    wide_named.to_csv(csv_path, index=False, encoding="utf-8-sig")
    return len(out)


def weighted_group_stats(df: pd.DataFrame, group_cols: list, anos: list):
    """Para cada combinação de group_cols (já filtrada por etapa/indicador/rede), calcula
    média simples entre municípios e nº de observações válidas, por ano — excluindo
    sempre os valores não disponíveis do cálculo (nunca tratados como zero)."""
    result = {}
    for keys, g in df.groupby(group_cols, observed=True):
        if not isinstance(keys, tuple):
            keys = (keys,)
        node = result
        for k in keys[:-1]:
            node = node.setdefault(str(k), {})
        leaf = {}
        for ano in anos:
            vals = g.loc[g["ano"] == ano, "valor"].dropna()
            leaf[str(ano)] = {"media": clean_num(vals.mean()) if len(vals) else None, "n": int(len(vals))}
        node[str(keys[-1])] = leaf
    return result


def export_series_agregadas(fato: pd.DataFrame, dim_etapa: pd.DataFrame):
    out = {"Brasil": {}, "Regiao": {}, "UF": {}}
    for etapa in SLUGS:
        anos = sorted(int(a) for a in fato.loc[fato["etapa"] == etapa, "ano"].unique())
        for indicador in ["IDEB", "Meta IDEB"]:
            ind_key = INDICADOR_KEY[indicador]
            base = fato[(fato["etapa"] == etapa) & (fato["indicador"] == indicador)]

            # Brasil
            out["Brasil"].setdefault(etapa, {})[ind_key] = weighted_group_stats(base.assign(_g="Brasil"), ["_g", "rede"], anos)["Brasil"]
            # Região
            out["Regiao"].setdefault(etapa, {})[ind_key] = weighted_group_stats(base, ["regiao", "rede"], anos)
            # UF
            out["UF"].setdefault(etapa, {})[ind_key] = weighted_group_stats(base, ["uf", "rede"], anos)

    with open(WEB_DATA / "series_agregadas.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))


def export_meta(dim_etapa: pd.DataFrame, dim_tempo: pd.DataFrame, dim_indicador: pd.DataFrame, dim_mun: pd.DataFrame):
    manifest = {
        "titulo": "Painel Nacional — IDEB 2025",
        "fonte": "Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira — INEP/MEC. Divulgação do IDEB 2025.",
        "gerado_em": pd.Timestamp.now("UTC").isoformat(),
        "etapas": {
            row.etapa: {
                "slug": SLUGS[row.etapa],
                "primeiro_ano": int(row.primeiro_ano_disponivel),
                "ultimo_ano": int(row.ultimo_ano_disponivel),
                "anos": sorted(int(a) for a in dim_tempo["ano"] if a >= row.primeiro_ano_disponivel and a <= row.ultimo_ano_disponivel and (a >= 2017 or row.etapa != "Ensino Médio")),
            }
            for row in dim_etapa.itertuples()
        },
        "redes": REDES,
        "indicadores": dim_indicador.to_dict(orient="records"),
        "regioes": sorted(dim_mun["regiao"].dropna().unique().tolist()),
        "ufs": sorted(dim_mun[["uf", "uf_nome", "regiao"]].drop_duplicates().to_dict(orient="records"), key=lambda r: r["uf"]),
        "total_municipios": int(dim_mun["codigo_ibge"].nunique()),
        "valores_referencia_nacional_2025": {"Anos Iniciais": 6.222, "Anos Finais": 5.115, "Ensino Médio": 4.469},
    }
    with open(WEB_DATA / "meta.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, default=str)
    return manifest


def copy_audit_and_geo():
    audit_out = WEB_DATA / "audit"
    audit_out.mkdir(exist_ok=True)
    for fn in ["catalogo_fontes.json", "qualidade_valores.json", "modelo_estrela.json", "validacao.json"]:
        shutil.copy(AUDIT_DIR / fn, audit_out / fn)
    shutil.copy(GEO_DIR / "municipios_br.topojson", WEB_DATA / "municipios_br.topojson")


def main():
    fato = pd.read_parquet(PROC_DIR / "fato_ideb.parquet")
    dim_mun = pd.read_parquet(PROC_DIR / "dim_municipio.parquet")
    dim_rede = pd.read_parquet(PROC_DIR / "dim_rede.parquet")
    dim_etapa = pd.read_parquet(PROC_DIR / "dim_etapa.parquet")
    dim_tempo = pd.read_parquet(PROC_DIR / "dim_tempo.parquet")
    dim_indicador = pd.read_parquet(PROC_DIR / "dim_indicador.parquet")

    export_municipios(dim_mun)
    manifest = export_meta(dim_etapa, dim_tempo, dim_indicador, dim_mun)

    for etapa in SLUGS:
        anos = manifest["etapas"][etapa]["anos"]
        n = export_etapa_municipal(etapa, fato, anos)
        print(f"[{etapa}] combos município+rede exportados: {n}")

    export_series_agregadas(fato, dim_etapa)
    copy_audit_and_geo()

    # relatório de tamanhos
    total = 0
    for p in sorted(WEB_DATA.rglob("*")):
        if p.is_file():
            sz = p.stat().st_size
            total += sz
            print(f"{p.relative_to(WEB_DATA)}: {sz/1024:.1f} KB")
    print(f"TOTAL public/data: {total/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
