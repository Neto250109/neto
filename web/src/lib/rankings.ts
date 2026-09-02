import type { MunicipioRedeRow } from "./useEtapaRows";
import { valorNoAno } from "./useEtapaRows";

export interface Posicao {
  rankNacional: number;
  totalNacional: number;
  rankEstadual: number;
  totalEstadual: number;
}

/** Calcula a posição de cada município no ranking nacional e estadual, para um
 * indicador e ano dados, dentro do conjunto de linhas já filtrado por rede.
 * Empates recebem a mesma posição (rank denso por valor, não por índice). */
export function computeRankings(
  rows: MunicipioRedeRow[],
  ano: number,
  campo: "ideb" = "ideb",
): Map<string, Posicao> {
  const comValor = rows
    .map((r) => ({ row: r, v: valorNoAno(r, campo, ano) }))
    .filter((x): x is { row: MunicipioRedeRow; v: number } => x.v !== null);

  const porUf = new Map<string, typeof comValor>();
  for (const item of comValor) {
    const arr = porUf.get(item.row.uf) ?? [];
    arr.push(item);
    porUf.set(item.row.uf, arr);
  }

  const nacionalOrdenado = [...comValor].sort((a, b) => b.v - a.v);
  const rankNacional = new Map<string, number>();
  nacionalOrdenado.forEach((item, i) => {
    const anterior = i > 0 ? nacionalOrdenado[i - 1] : null;
    const rank = anterior && anterior.v === item.v ? rankNacional.get(anterior.row.codigo)! : i + 1;
    rankNacional.set(item.row.codigo, rank);
  });

  const resultado = new Map<string, Posicao>();
  for (const [uf, arr] of porUf) {
    const ordenado = [...arr].sort((a, b) => b.v - a.v);
    ordenado.forEach((item, i) => {
      const anterior = i > 0 ? ordenado[i - 1] : null;
      const rankEstadual = anterior && anterior.v === item.v ? resultado.get(anterior.row.codigo)!.rankEstadual : i + 1;
      resultado.set(item.row.codigo, {
        rankNacional: rankNacional.get(item.row.codigo)!,
        totalNacional: nacionalOrdenado.length,
        rankEstadual,
        totalEstadual: ordenado.length,
      });
    });
    void uf;
  }
  return resultado;
}
