import type { EChartsOption } from "echarts";
import Chart from "../Chart";
import { tokens, brand } from "../../lib/colors";

export default function BarRankChart({
  categorias,
  valores,
  height = 340,
  colorFn,
  yName = "",
  horizontal = true,
  valueFmt,
}: {
  categorias: string[];
  valores: (number | null)[];
  height?: number;
  colorFn?: (v: number | null, idx: number) => string;
  yName?: string;
  horizontal?: boolean;
  valueFmt?: (v: number) => string;
}) {
  const t = tokens();
  const b = brand();
  const fmt = valueFmt ?? ((v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const catAxis = {
    type: "category" as const,
    data: categorias,
    axisLine: { lineStyle: { color: t.baseline } },
    axisLabel: { color: t.textSecondary, fontSize: 11, interval: 0 },
  };
  const valAxis = {
    type: "value" as const,
    name: yName,
    nameTextStyle: { color: t.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: t.gridline } },
    axisLabel: { color: t.muted, fontSize: 11 },
  };
  const option: EChartsOption = {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "system-ui, sans-serif" },
    grid: horizontal ? { left: 140, right: 30, top: 10, bottom: 24 } : { left: 44, right: 16, top: 10, bottom: 60 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: t.surface,
      borderColor: t.border,
      textStyle: { color: t.textPrimary },
      valueFormatter: (v) => (v === null || v === undefined ? "ND" : fmt(Number(v))),
    },
    xAxis: horizontal ? valAxis : catAxis,
    yAxis: horizontal ? catAxis : valAxis,
    series: [
      {
        type: "bar",
        data: valores.map((v, i) => ({ value: v, itemStyle: { color: colorFn ? colorFn(v, i) : b.light, borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] } })),
        barMaxWidth: 26,
      },
    ],
  };
  return <Chart option={option} height={height} />;
}
