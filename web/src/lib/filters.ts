import { create } from "zustand";
import type { Etapa, IndicadorKey, Rede } from "./../types";

export interface FiltersState {
  etapa: Etapa;
  redes: Rede[];
  regiao: string | null;
  uf: string | null;
  municipio: string | null; // codigo IBGE
  anoInicial: number | null;
  anoFinal: number | null;
  indicador: IndicadorKey;
  setEtapa: (e: Etapa) => void;
  setRedes: (r: Rede[]) => void;
  setRegiao: (r: string | null) => void;
  setUf: (u: string | null) => void;
  setMunicipio: (m: string | null) => void;
  setAnoRange: (a: number | null, b: number | null) => void;
  setIndicador: (i: IndicadorKey) => void;
  limparFiltros: () => void;
}

const initial = {
  etapa: "Anos Iniciais" as Etapa,
  redes: ["Pública"] as Rede[],
  regiao: null,
  uf: null,
  municipio: null,
  anoInicial: null,
  anoFinal: null,
  indicador: "ideb" as IndicadorKey,
};

export const useFilters = create<FiltersState>((set) => ({
  ...initial,
  setEtapa: (etapa) => set({ etapa }),
  setRedes: (redes) => set({ redes }),
  setRegiao: (regiao) => set({ regiao, uf: null, municipio: null }),
  setUf: (uf) => set({ uf, municipio: null }),
  setMunicipio: (municipio) => set({ municipio }),
  setAnoRange: (anoInicial, anoFinal) => set({ anoInicial, anoFinal }),
  setIndicador: (indicador) => set({ indicador }),
  limparFiltros: () => set({ ...initial }),
}));
