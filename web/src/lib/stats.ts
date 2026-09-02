export function clean(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v));
}

export function mean(values: (number | null | undefined)[]): number | null {
  const v = clean(values);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function median(values: (number | null | undefined)[]): number | null {
  const v = clean(values).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function quantile(values: (number | null | undefined)[], q: number): number | null {
  const v = clean(values).slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const pos = (v.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (v[base + 1] !== undefined) return v[base] + rest * (v[base + 1] - v[base]);
  return v[base];
}

export function stddev(values: (number | null | undefined)[]): number | null {
  const v = clean(values);
  if (v.length < 2) return null;
  const m = mean(v)!;
  const variance = v.reduce((acc, x) => acc + (x - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(variance);
}

export interface DescStats {
  n: number;
  media: number | null;
  mediana: number | null;
  min: number | null;
  max: number | null;
  desvioPadrao: number | null;
  q1: number | null;
  q3: number | null;
  amplitude: number | null;
}

export function describe(values: (number | null | undefined)[]): DescStats {
  const v = clean(values);
  const min = v.length ? Math.min(...v) : null;
  const max = v.length ? Math.max(...v) : null;
  return {
    n: v.length,
    media: mean(v),
    mediana: median(v),
    min,
    max,
    desvioPadrao: stddev(v),
    q1: quantile(v, 0.25),
    q3: quantile(v, 0.75),
    amplitude: min !== null && max !== null ? max - min : null,
  };
}

export type ClassificacaoDesempenho = "Muito alto" | "Alto" | "Médio" | "Baixo" | "Muito baixo";

/** Classificação por quartis, calculada dinamicamente sobre o conjunto filtrado. */
export function classificarDesempenho(valor: number | null, stats: DescStats): ClassificacaoDesempenho | null {
  if (valor === null || stats.q1 === null || stats.q3 === null || stats.mediana === null) return null;
  if (valor >= stats.q3) return "Muito alto";
  if (valor >= stats.mediana) return "Alto";
  if (valor >= stats.q1) return "Médio";
  if (valor >= (stats.min ?? -Infinity)) return "Baixo";
  return "Muito baixo";
}

export interface LimitesEvolucao {
  forteCrescimento: number;
  crescimento: number;
  estabilidade: number; // abs(delta) <= estabilidade é "Estabilidade"
  queda: number;
  forteQueda: number;
}
export const LIMITES_EVOLUCAO_PADRAO: LimitesEvolucao = {
  forteCrescimento: 0.6,
  crescimento: 0.1,
  estabilidade: 0.1,
  queda: -0.1,
  forteQueda: -0.6,
};

export type ClassificacaoEvolucao = "Forte crescimento" | "Crescimento" | "Estabilidade" | "Queda" | "Forte queda";

export function classificarEvolucao(delta: number | null, limites: LimitesEvolucao = LIMITES_EVOLUCAO_PADRAO): ClassificacaoEvolucao | null {
  if (delta === null) return null;
  if (delta >= limites.forteCrescimento) return "Forte crescimento";
  if (delta >= limites.crescimento) return "Crescimento";
  if (delta > -limites.estabilidade) return "Estabilidade";
  if (delta > limites.forteQueda) return "Queda";
  return "Forte queda";
}

export type ClassificacaoMeta = "Acima da meta" | "Atingiu a meta" | "Abaixo da meta";
export function classificarMeta(observado: number | null, meta: number | null, tolerancia = 0.05): ClassificacaoMeta | null {
  if (observado === null || meta === null) return null;
  const diff = observado - meta;
  if (diff > tolerancia) return "Acima da meta";
  if (diff >= -tolerancia) return "Atingiu a meta";
  return "Abaixo da meta";
}
