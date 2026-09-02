import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import VisaoGeral from "./pages/VisaoGeral";
import Brasil from "./pages/Brasil";
import Regioes from "./pages/Regioes";
import RegiaoDetalhe from "./pages/RegiaoDetalhe";
import Estados from "./pages/Estados";
import UfDetalhe from "./pages/UfDetalhe";
import Municipios from "./pages/Municipios";
import PerfilMunicipal from "./pages/PerfilMunicipal";
import EtapaPage from "./pages/EtapaPage";
import Redes from "./pages/Redes";
import IdebMeta from "./pages/IdebMeta";
import Evolucao from "./pages/Evolucao";
import Ranking from "./pages/Ranking";
import Mapa from "./pages/Mapa";
import Distribuicao from "./pages/Distribuicao";
import Decomposicao from "./pages/Decomposicao";
import Qualidade from "./pages/Qualidade";
import Metodologia from "./pages/Metodologia";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<VisaoGeral />} />
          <Route path="/brasil" element={<Brasil />} />
          <Route path="/territorio/regioes" element={<Regioes />} />
          <Route path="/territorio/regiao/:regiao" element={<RegiaoDetalhe />} />
          <Route path="/territorio/estados" element={<Estados />} />
          <Route path="/territorio/uf/:uf" element={<UfDetalhe />} />
          <Route path="/municipios" element={<Municipios />} />
          <Route path="/municipio/:codigo" element={<PerfilMunicipal />} />
          <Route path="/etapa/:slug" element={<EtapaPage />} />
          <Route path="/redes" element={<Redes />} />
          <Route path="/ideb-meta" element={<IdebMeta />} />
          <Route path="/evolucao" element={<Evolucao />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/distribuicao" element={<Distribuicao />} />
          <Route path="/decomposicao" element={<Decomposicao />} />
          <Route path="/qualidade" element={<Qualidade />} />
          <Route path="/metodologia" element={<Metodologia />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
