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

export const DIVERGING = { neg: "#e34948", pos: "#2a78d6", neutralLight: "#f0efec", neutralDark: "#383835" };

export const STATUS = { good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b" };

export const TOKENS_LIGHT = {
  surface: "#fcfcfb",
  page: "#f9f9f7",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  successText: "#006300",
  border: "rgba(11,11,11,0.10)",
};
export const TOKENS_DARK = {
  surface: "#1a1a19",
  page: "#0d0d0d",
  textPrimary: "#ffffff",
  textSecondary: "#c3c2b7",
  muted: "#898781",
  gridline: "#2c2c2a",
  baseline: "#383835",
  successText: "#0ca30c",
  border: "rgba(255,255,255,0.10)",
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
