import { useEffect, useState } from "react";
import { useDataStore } from "./dataStore";
import type { Etapa, Rede } from "../types";

export interface MunicipioRedeRow {
  codigo: string;
  nome: string;
  uf: string;
  uf_nome: string;
  regiao: string;
  rede: Rede;
  anos: number[];
  ideb: (number | null)[];
  meta: (number | null)[];
  aprov: (number | null)[];
  rend: (number | null)[];
  mat: (number | null)[];
  port: (number | null)[];
  nm: (number | null)[];
}

function byAno(anos: number[], serie: (number | null)[] | undefined): (number | null)[] {
  if (!serie) return anos.map(() => null);
  return anos.map((_, i) => (serie[i] === undefined ? null : serie[i]));
}

/** Constrói as linhas normalizadas Município×Rede para uma etapa, cruzando os dados
 * compactos exportados pelo ETL com a dimensão de município (nome/UF/região). */
export function useEtapaRows(etapa: Etapa): { rows: MunicipioRedeRow[]; anos: number[]; loading: boolean } {
  const { meta, municipios, etapaData, loadEtapa } = useDataStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadEtapa(etapa).then(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [etapa, loadEtapa]);

  const data = etapaData[etapa];
  const anos = meta?.etapas[etapa]?.anos ?? [];
  if (!data || !municipios || !anos.length) return { rows: [], anos, loading };

  const rows: MunicipioRedeRow[] = [];
  for (const codigo of Object.keys(data)) {
    const dim = municipios[codigo];
    if (!dim) continue;
    const redesObj = data[codigo];
    for (const rede of Object.keys(redesObj) as Rede[]) {
      const serie = redesObj[rede]!;
      rows.push({
        codigo,
        nome: dim.nome,
        uf: dim.uf,
        uf_nome: dim.uf_nome,
        regiao: dim.regiao,
        rede,
        anos,
        ideb: byAno(anos, serie.ideb),
        meta: byAno(anos, serie.meta),
        aprov: byAno(anos, serie.aprov),
        rend: byAno(anos, serie.rend),
        mat: byAno(anos, serie.mat),
        port: byAno(anos, serie.port),
        nm: byAno(anos, serie.nm),
      });
    }
  }
  return { rows, anos, loading };
}

export function valorNoAno(row: MunicipioRedeRow, campo: keyof Pick<MunicipioRedeRow, "ideb" | "meta" | "aprov" | "rend" | "mat" | "port" | "nm">, ano: number): number | null {
  const idx = row.anos.indexOf(ano);
  if (idx === -1) return null;
  return row[campo][idx];
}

/** Último ano (olhando de trás para frente) em que o campo tem valor disponível. */
export function ultimoDisponivel(row: MunicipioRedeRow, campo: keyof Pick<MunicipioRedeRow, "ideb" | "meta" | "aprov" | "rend" | "mat" | "port" | "nm">): { ano: number; valor: number } | null {
  for (let i = row.anos.length - 1; i >= 0; i--) {
    const v = row[campo][i];
    if (v !== null) return { ano: row.anos[i], valor: v };
  }
  return null;
}
