import type { EChartsOption } from "echarts";
import Chart from "../Chart";
import { tokens } from "../../lib/colors";
import { describe } from "../../lib/stats";

export default function BoxplotChart({ grupos, height = 320 }: { grupos: { nome: string; valores: number[] }[]; height?: number }) {
  const t = tokens();
  const data = grupos.map((g) => {
    const d = describe(g.valores);
    return [d.min ?? 0, d.q1 ?? 0, d.mediana ?? 0, d.q3 ?? 0, d.max ?? 0];
  });
  const option: EChartsOption = {
    backgroundColor: "transparent",
    grid: { left: 90, right: 20, top: 10, bottom: 30 },
    tooltip: {
      backgroundColor: t.surface,
      borderColor: t.border,
      textStyle: { color: t.textPrimary },
      formatter: (p: unknown) => {
        const pp = p as { name: string; value: number[] };
        const [min, q1, med, q3, max] = pp.value;
        return `<b>${pp.name}</b><br/>máx: ${max.toFixed(2)}<br/>q3: ${q3.toFixed(2)}<br/>mediana: ${med.toFixed(2)}<br/>q1: ${q1.toFixed(2)}<br/>mín: ${min.toFixed(2)}`;
      },
    },
    xAxis: {
      type: "value",
      name: "IDEB",
      nameTextStyle: { color: t.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: t.gridline } },
      axisLabel: { color: t.muted, fontSize: 11 },
    },
    yAxis: {
      type: "category",
      data: grupos.map((g) => g.nome),
      axisLine: { lineStyle: { color: t.baseline } },
      axisLabel: { color: t.textSecondary, fontSize: 11 },
    },
    series: [
      {
        type: "boxplot",
        data,
        itemStyle: { color: "#cde2fb", borderColor: "#2a78d6", borderWidth: 1.5 },
      },
    ],
  };
  return <Chart option={option} height={height} />;
}
