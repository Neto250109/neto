"""
ETL — Etapa 2: Limpeza e padronização de valores

Regras (nunca corrigidas silenciosamente, sempre com status explícito):
  * número (int/float) already parsed pelo Excel .......... -> Disponível
  * texto numérico com vírgula decimal ("6,22") ............ -> Disponível (convertido para 6.22)
  * texto numérico terminado em "*" ("209,70*") ............ -> Disponível, com nota_metodologica=True
    (o INEP usa "*" para sinalizar uma nota de rodapé metodológica; o valor em si é válido)
  * "-" ...................................................... -> Não avaliado (etapa/rede não avaliada)
  * "ND" / "ND*" / "ND***" ................................... -> Não divulgado (sigilo estatístico)
  * célula vazia / None ...................................... -> Ausente
Nenhum desses casos é convertido para zero.
"""
import re
import json
import pandas as pd
from pathlib import Path

PROC_DIR = Path(__file__).resolve().parents[1] / "dados" / "processado"
AUDIT_DIR = Path(__file__).resolve().parents[1] / "audit"

NUM_RE = re.compile(r"^-?\d+(?:,\d+)?$")

SLUGS = {"Anos Iniciais": "anos_iniciais", "Anos Finais": "anos_finais", "Ensino Médio": "ensino_medio"}


def parse_valor(raw):
    """Retorna (valor: float|None, status: str, nota_metodologica: bool)."""
    if raw is None or raw == "None" or raw == "":
        return None, "Ausente", False
    s = str(raw).strip()
    nota = s.endswith("*")
    s_clean = s.rstrip("*").strip()
    if s_clean == "-":
        return None, "Não avaliado", False
    if s_clean.upper() == "ND":
        return None, "Não divulgado", nota
    if NUM_RE.match(s_clean):
        return float(s_clean.replace(",", ".")), "Disponível", nota
    # fallback: já pode vir como float/int representado em string ("6.22", "100")
    try:
        return float(s_clean), "Disponível", nota
    except ValueError:
        return None, "Ausente", False


def clean_etapa(etapa: str):
    slug = SLUGS[etapa]
    df = pd.read_parquet(PROC_DIR / f"long_{slug}.parquet")
    parsed = df["valor_bruto"].apply(parse_valor)
    df["valor"] = parsed.apply(lambda t: t[0]).astype("float64")
    df["status"] = parsed.apply(lambda t: t[1]).astype("category")
    df["nota_metodologica"] = parsed.apply(lambda t: t[2])
    df["co_municipio"] = df["co_municipio"].astype("int64")
    df["ano"] = df["ano"].astype("int16")
    out_fn = PROC_DIR / f"clean_{slug}.parquet"
    df.to_parquet(out_fn, index=False)
    resumo = {
        "etapa": etapa,
        "registros": len(df),
        "status_contagem": df["status"].value_counts().to_dict(),
        "percentual_disponivel": round(100 * (df["status"] == "Disponível").mean(), 2),
        "registros_com_nota_metodologica": int(df["nota_metodologica"].sum()),
    }
    print(f"[{etapa}]", resumo["status_contagem"], f"% disponível={resumo['percentual_disponivel']}")
    return resumo


def main():
    resumos = {etapa: clean_etapa(etapa) for etapa in SLUGS}
    with open(AUDIT_DIR / "qualidade_valores.json", "w", encoding="utf-8") as f:
        json.dump(resumos, f, ensure_ascii=False, indent=2, default=str)
    print("Resumo de qualidade salvo em audit/qualidade_valores.json")


if __name__ == "__main__":
    main()
