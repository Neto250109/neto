import { create } from "zustand";
import type { EtapaMunicipioData, MetaJSON, MunicipiosDict, SeriesAgregadasJSON, Etapa } from "../types";
import { ETAPA_SLUG } from "../types";

const BASE = `${import.meta.env.BASE_URL}data`;

interface DataState {
  meta: MetaJSON | null;
  municipios: MunicipiosDict | null;
  seriesAgregadas: SeriesAgregadasJSON | null;
  etapaData: Partial<Record<Etapa, EtapaMunicipioData>>;
  loadingEtapa: Partial<Record<Etapa, boolean>>;
  ready: boolean;
  error: string | null;
  init: () => Promise<void>;
  loadEtapa: (etapa: Etapa) => Promise<EtapaMunicipioData>;
}

export const useDataStore = create<DataState>((set, get) => ({
  meta: null,
  municipios: null,
  seriesAgregadas: null,
  etapaData: {},
  loadingEtapa: {},
  ready: false,
  error: null,
  async init() {
    if (get().ready || get().meta) return;
    try {
      const [meta, municipios, seriesAgregadas] = await Promise.all([
        fetch(`${BASE}/meta.json`).then((r) => r.json()) as Promise<MetaJSON>,
        fetch(`${BASE}/municipios.json`).then((r) => r.json()) as Promise<MunicipiosDict>,
        fetch(`${BASE}/series_agregadas.json`).then((r) => r.json()) as Promise<SeriesAgregadasJSON>,
      ]);
      set({ meta, municipios, seriesAgregadas, ready: true });
    } catch (e) {
      set({ error: String(e) });
    }
  },
  async loadEtapa(etapa: Etapa) {
    const existing = get().etapaData[etapa];
    if (existing) return existing;
    if (get().loadingEtapa[etapa]) {
      // aguarda a requisição em andamento
      while (!get().etapaData[etapa]) {
        await new Promise((r) => setTimeout(r, 50));
      }
      return get().etapaData[etapa]!;
    }
    set((s) => ({ loadingEtapa: { ...s.loadingEtapa, [etapa]: true } }));
    const slug = ETAPA_SLUG[etapa];
    const data = (await fetch(`${BASE}/dados_${slug}.json`).then((r) => r.json())) as EtapaMunicipioData;
    set((s) => ({ etapaData: { ...s.etapaData, [etapa]: data }, loadingEtapa: { ...s.loadingEtapa, [etapa]: false } }));
    return data;
  },
}));
