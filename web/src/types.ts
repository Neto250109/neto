export type Etapa = "Anos Iniciais" | "Anos Finais" | "Ensino Médio";
export type EtapaSlug = "anos_iniciais" | "anos_finais" | "ensino_medio";
export type Rede = "Pública" | "Municipal" | "Estadual" | "Federal";
export type IndicadorKey = "ideb" | "meta" | "aprov" | "rend" | "mat" | "port" | "nm";

export const ETAPAS: Etapa[] = ["Anos Iniciais", "Anos Finais", "Ensino Médio"];
export const ETAPA_SLUG: Record<Etapa, EtapaSlug> = {
  "Anos Iniciais": "anos_iniciais",
  "Anos Finais": "anos_finais",
  "Ensino Médio": "ensino_medio",
};
export const SLUG_ETAPA: Record<EtapaSlug, Etapa> = {
  anos_iniciais: "Anos Iniciais",
  anos_finais: "Anos Finais",
  ensino_medio: "Ensino Médio",
};
export const REDES: Rede[] = ["Pública", "Municipal", "Estadual", "Federal"];
export const REGIOES = ["Norte", "Nordeste", "Sudeste", "Sul", "Centro-Oeste"] as const;
export type Regiao = (typeof REGIOES)[number];

export const INDICADOR_LABEL: Record<IndicadorKey, string> = {
  ideb: "IDEB",
  meta: "Meta IDEB",
  aprov: "Taxa de Aprovação",
  rend: "Indicador de Rendimento",
  mat: "Nota SAEB - Matemática",
  port: "Nota SAEB - Língua Portuguesa",
  nm: "Nota Média Padronizada",
};

export interface MunicipioDim {
  nome: string;
  uf: string;
  uf_nome: string;
  regiao: Regiao;
}
export type MunicipiosDict = Record<string, MunicipioDim>;

// dados_<etapa>.json: { [codigo_ibge]: { [rede]: { [indicador_key]: (number|null)[] } } }
export type SerieIndicador = Partial<Record<IndicadorKey, (number | null)[]>>;
export type EtapaMunicipioData = Record<string, Partial<Record<Rede, SerieIndicador>>>;

export interface MetaEtapaInfo {
  slug: EtapaSlug;
  primeiro_ano: number;
  ultimo_ano: number;
  anos: number[];
}
export interface MetaJSON {
  titulo: string;
  fonte: string;
  gerado_em: string;
  etapas: Record<Etapa, MetaEtapaInfo>;
  redes: Rede[];
  indicadores: { indicador: string; grupo: string }[];
  regioes: Regiao[];
  ufs: { uf: string; uf_nome: string; regiao: Regiao }[];
  total_municipios: number;
  valores_referencia_nacional_2025: Record<Etapa, number>;
}

export interface AgregadoAnoStat {
  media: number | null;
  n: number;
}
export type SerieAgregadaGrupo = Record<string, Record<string, AgregadoAnoStat>>; // rede -> ano -> stat
export interface SeriesAgregadasJSON {
  Brasil: Record<Etapa, Partial<Record<IndicadorKey, SerieAgregadaGrupo>>>;
  Regiao: Record<Etapa, Partial<Record<IndicadorKey, Record<string, SerieAgregadaGrupo>>>>;
  UF: Record<Etapa, Partial<Record<IndicadorKey, Record<string, SerieAgregadaGrupo>>>>;
}
