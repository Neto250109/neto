import type { EChartsOption } from "echarts";
import Chart from "../Chart";
import { tokens } from "../../lib/colors";

export function buildBins(values: number[], nBins = 20): { labels: string[]; counts: number[] } {
  if (!values.length) return { labels: [], counts: [] };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = span / nBins;
  const counts = new Array(nBins).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= nBins) idx = nBins - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  const labels = counts.map((_, i) => (min + i * width).toFixed(1));
  return { labels, counts };
}

export default function HistogramChart({ values, height = 280, nBins = 20 }: { values: number[]; height?: number; nBins?: number }) {
  const t = tokens();
  const { labels, counts } = buildBins(values, nBins);
  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 44, right: 16, top: 14, bottom: 34 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: t.surface,
      borderColor: t.border,
      textStyle: { color: t.textPrimary },
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `faixa a partir de ${p.name}<br/>${p.value} município(s)`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: { color: t.muted, fontSize: 10, rotate: 45 },
      axisLine: { lineStyle: { color: t.baseline } },
    },
    yAxis: {
      type: "value",
      name: "Municípios",
      nameTextStyle: { color: t.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: t.gridline } },
      axisLabel: { color: t.muted, fontSize: 11 },
    },
    series: [{ type: "bar", data: counts, itemStyle: { color: "#2a78d6", borderRadius: [3, 3, 0, 0] }, barCategoryGap: "8%" }],
  };
  return <Chart option={option} height={height} />;
}
