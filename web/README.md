# IDEB 2025 — BI web

Frontend do Painel Nacional IDEB 2025 (React + TypeScript + Vite). Ver o README na raiz do
repositório para o panorama completo do projeto (ETL, metodologia, arquitetura).

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # build de produção em dist/
npm run preview   # servir o build localmente
```

Os dados consumidos por esta aplicação estão em `public/data/` (JSON compactos gerados pelo
ETL em `../scripts/`) e `public/downloads/` (CSVs para exportação). Nenhum dado é buscado de
um backend — a aplicação é 100% estática.
