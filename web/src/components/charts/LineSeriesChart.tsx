import type { EChartsOption } from "echarts";
import Chart from "../Chart";
import { catColor, tokens } from "../../lib/colors";

export interface LineSeries {
  name: string;
  data: (number | null)[];
  n?: number[]; // nº de observações por ponto (tooltip)
}

export default function LineSeriesChart({
  categorias,
  series,
  height = 340,
  yName = "IDEB",
  yMin,
  yMax,
}: {
  categorias: (string | number)[];
  series: LineSeries[];
  height?: number;
  yName?: string;
  yMin?: number;
  yMax?: number;
}) {
  const t = tokens();
  const option: EChartsOption = {
    backgroundColor: "transparent",
    textStyle: { color: t.textPrimary, fontFamily: "system-ui, sans-serif" },
    grid: { left: 44, right: 20, top: series.length > 1 ? 40 : 16, bottom: 32 },
    legend: series.length > 1 ? { top: 0, textStyle: { color: t.textSecondary, fontSize: 12 }, icon: "circle" } : undefined,
    tooltip: {
      trigger: "axis",
      backgroundColor: t.surface,
      borderColor: t.border,
      textStyle: { color: t.textPrimary },
      valueFormatter: (v) => (v === null || v === undefined ? "ND" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })),
    },
    xAxis: {
      type: "category",
      data: categorias as string[],
      axisLine: { lineStyle: { color: t.baseline } },
      axisLabel: { color: t.muted, fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: yName,
      min: yMin,
      max: yMax,
      nameTextStyle: { color: t.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: t.gridline } },
      axisLabel: { color: t.muted, fontSize: 11 },
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: "line",
      data: s.data,
      connectNulls: false,
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { width: 2, color: catColor(i) },
      itemStyle: { color: catColor(i) },
      emphasis: { focus: "series" },
    })),
  };
  return <Chart option={option} height={height} />;
}
