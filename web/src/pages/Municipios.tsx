import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDataStore } from "../lib/dataStore";
import DataTable from "../components/DataTable";

export default function Municipios() {
  const { municipios, meta } = useDataStore();
  const [busca, setBusca] = useState("");
  const [uf, setUf] = useState("");
  const navigate = useNavigate();

  const lista = useMemo(() => {
    if (!municipios) return [];
    const termo = busca.trim().toLowerCase();
    return Object.entries(municipios)
      .filter(([, d]) => (!uf || d.uf === uf) && (!termo || d.nome.toLowerCase().includes(termo)))
      .map(([codigo, d]) => ({ codigo, ...d }));
  }, [municipios, busca, uf]);

  return (
    <div>
      <h1 className="page-title">Municípios</h1>
      <p className="page-subtitle">
        Explore os {meta?.total_municipios.toLocaleString("pt-BR")} municípios brasileiros presentes na divulgação do IDEB 2025. Selecione um município para abrir o perfil educacional completo.
      </p>

      <div className="card" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input type="search" placeholder="Buscar município…" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select value={uf} onChange={(e) => setUf(e.target.value)}>
          <option value="">Todas as UFs</option>
          {meta?.ufs.map((u) => (
            <option key={u.uf} value={u.uf}>
              {u.uf} — {u.uf_nome}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <DataTable
          columns={[
            { key: "nome", label: "Município" },
            { key: "uf", label: "UF", width: 60 },
            { key: "regiao", label: "Região" },
          ]}
          rows={lista}
          defaultSortKey="nome"
          defaultSortDir="asc"
          pageSize={30}
          onRowClick={(r) => navigate(`/municipio/${r.codigo}`)}
          exportFilename="municipios"
        />
      </div>
    </div>
  );
}
