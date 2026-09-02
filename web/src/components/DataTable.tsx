import { useMemo, useState } from "react";
import { exportCSV } from "../lib/csvExport";

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  value?: (row: T) => number | string | null;
  width?: number;
}

export default function DataTable<T>({
  columns,
  rows,
  pageSize = 20,
  defaultSortKey,
  defaultSortDir = "desc",
  onRowClick,
  exportFilename,
  emptyLabel = "Nenhum registro para os filtros selecionados.",
  csvRows,
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  defaultSortKey?: string;
  defaultSortDir?: "asc" | "desc";
  onRowClick?: (row: T) => void;
  exportFilename?: string;
  emptyLabel?: string;
  csvRows?: (rows: T[]) => Record<string, unknown>[];
}) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    const getVal = col?.value ?? ((r: T) => (r as Record<string, unknown>)[sortKey] as number | string | null);
    const arr = [...rows].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb), "pt-BR");
      return (va as number) - (vb as number);
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [rows, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const curPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(curPage * pageSize, curPage * pageSize + pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {sorted.length.toLocaleString("pt-BR")} registro(s)
        </span>
        {exportFilename && (
          <button
            className="btn"
            onClick={() => exportCSV(exportFilename, csvRows ? csvRows(sorted) : (sorted as unknown as Record<string, unknown>[]))}
          >
            Exportar CSV
          </button>
        )}
      </div>
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ textAlign: c.align ?? "left", width: c.width }} onClick={() => toggleSort(c.key)}>
                  {c.label} {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="muted" style={{ textAlign: "center", padding: 24 }}>
                  {emptyLabel}
                </td>
              </tr>
            )}
            {pageRows.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? "pointer" : undefined }}>
                {columns.map((c) => (
                  <td key={c.key} className="tabular" style={{ textAlign: c.align ?? "left" }}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
          <button className="btn" disabled={curPage === 0} onClick={() => setPage(0)}>
            «
          </button>
          <button className="btn" disabled={curPage === 0} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span className="tabular muted" style={{ fontSize: 12.5 }}>
            página {curPage + 1} de {pageCount}
          </span>
          <button className="btn" disabled={curPage >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            ›
          </button>
          <button className="btn" disabled={curPage >= pageCount - 1} onClick={() => setPage(pageCount - 1)}>
            »
          </button>
        </div>
      )}
    </div>
  );
}
