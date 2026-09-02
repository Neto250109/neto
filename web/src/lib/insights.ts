import { fmtNum, fmtPct } from "./format";
import type { DescStats } from "./stats";

export interface GrupoStat {
  nome: string;
  stats: DescStats;
}

/** Gera frases analíticas curtas, sempre derivadas diretamente dos números fornecidos
 * (rotuladas como "indicador calculado pelo BI"), nunca de conclusões externas. */
export function insightRankingTerritorial(grupos: GrupoStat[], rotulo: string): string | null {
  const validos = grupos.filter((g) => g.stats.media !== null && g.stats.n > 0);
  if (validos.length < 2) return null;
  const ordenado = [...validos].sort((a, b) => (b.stats.media ?? 0) - (a.stats.media ?? 0));
  const melhor = ordenado[0];
  const pior = ordenado[ordenado.length - 1];
  const delta = (melhor.stats.media ?? 0) - (pior.stats.media ?? 0);
  return `Entre as ${rotulo} analisadas, ${melhor.nome} tem a maior média de IDEB (${fmtNum(melhor.stats.media, 2)}), enquanto ${pior.nome} tem a menor (${fmtNum(pior.stats.media, 2)}) — uma diferença de ${fmtNum(delta, 2)} pontos.`;
}

export function insightDispersaoTerritorial(grupos: GrupoStat[], rotulo: string): string | null {
  const validos = grupos.filter((g) => g.stats.desvioPadrao !== null && g.stats.n >= 5);
  if (validos.length < 2) return null;
  const maisDisperso = [...validos].sort((a, b) => (b.stats.desvioPadrao ?? 0) - (a.stats.desvioPadrao ?? 0))[0];
  const menosDisperso = [...validos].sort((a, b) => (a.stats.desvioPadrao ?? 0) - (b.stats.desvioPadrao ?? 0))[0];
  if (maisDisperso.nome === menosDisperso.nome) return null;
  return `${maisDisperso.nome} concentra a maior desigualdade municipal entre as ${rotulo} (desvio-padrão ${fmtNum(maisDisperso.stats.desvioPadrao, 2)}), contra ${fmtNum(menosDisperso.stats.desvioPadrao, 2)} em ${menosDisperso.nome} — o grupo mais homogêneo.`;
}

export function insightMeta(nAcima: number, nTotal: number, anoMeta: number | null): string | null {
  if (nTotal === 0) return null;
  const pct = (nAcima / nTotal) * 100;
  return `${fmtPct(pct, 1)} dos municípios com meta e resultado disponíveis (${nAcima} de ${nTotal}) estavam acima da meta projetada para ${anoMeta ?? "o último ciclo"}.`;
}

export function insightEvolucao(mediaAtual: number | null, mediaAnterior: number | null, anoAtual: number, anoAnterior: number): string | null {
  if (mediaAtual === null || mediaAnterior === null) return null;
  const delta = mediaAtual - mediaAnterior;
  const direcao = delta > 0.01 ? "cresceu" : delta < -0.01 ? "caiu" : "manteve-se estável";
  return `A média entre os municípios com dado disponível ${direcao} de ${fmtNum(mediaAnterior, 2)} (${anoAnterior}) para ${fmtNum(mediaAtual, 2)} (${anoAtual}), variação de ${fmtNum(delta, 2)} pontos.`;
}
