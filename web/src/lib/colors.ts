// Paleta validada (skill dataviz) — ordem categórica fixa, nunca ciclada.
export const CATEGORICAL_LIGHT = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];
export const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

// Papéis fixos do domínio (mantém a mesma cor para a mesma entidade em toda a aplicação)
export const REDE_COLOR: Record<string, number> = { "Pública": 0, "Municipal": 1, "Estadual": 2, "Federal": 3 };
export const ETAPA_COLOR: Record<string, number> = { "Anos Iniciais": 0, "Anos Finais": 1, "Ensino Médio": 2 };
export const REGIAO_COLOR: Record<string, number> = { "Norte": 3, "Nordeste": 1, "Centro-Oeste": 4, "Sudeste": 0, "Sul": 6 };

export const SEQUENTIAL_BLUE = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];

// Rampa sequencial na cor institucional (verde territorial), usada como padrão nos mapas.
export const SEQUENTIAL_GREEN = [
  "#ddf8f3", "#ccf5ed", "#baf2e7", "#a5eedf", "#90ead8", "#76e5cf", "#5ce0c6", "#3edabb", "#27ceac", "#21b093", "#1c927a", "#167461", "#105648",
];

export const DIVERGING = { neg: "#e34948", pos: "#2a78d6", neutralLight: "#f0efec", neutralDark: "#383835" };

export const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" };

// Identidade institucional (verde territorial/educacional) — usada para elementos de
// interface (botões, destaques, marca), nunca para recodificar séries de dados.
export const BRAND = { light: "#18a589", strong: "#0f8570", deep: "#1b5674", soft: "#e3f4f0" };
export const BRAND_DARK = { light: "#1dc9a6", strong: "#29e0ba", deep: "#309ad0", soft: "rgba(29,201,166,0.14)" };
export function brand() {
  return isDark() ? BRAND_DARK : BRAND;
}

export const TOKENS_LIGHT = {
  surface: "#ffffff",
  page: "#f5f7fa",
  textPrimary: "#142434",
  textSecondary: "#2b3d4f",
  muted: "#738089",
  gridline: "#e6ebf0",
  baseline: "#c7d2d9",
  successText: "#0d7a52",
  border: "rgba(20,36,52,0.10)",
};
export const TOKENS_DARK = {
  surface: "#191d24",
  page: "#10131a",
  textPrimary: "#f1f5f8",
  textSecondary: "#c3ccd4",
  muted: "#8b98a4",
  gridline: "#2a2f38",
  baseline: "#3a4149",
  successText: "#29c58a",
  border: "rgba(241,245,248,0.10)",
};

export function isDark(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.hasAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function catColor(index: number): string {
  const arr = isDark() ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
  return arr[index % arr.length];
}
export function tokens() {
  return isDark() ? TOKENS_DARK : TOKENS_LIGHT;
}
