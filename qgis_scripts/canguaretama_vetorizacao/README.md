# Vetorização de Canguaretama/RN no QGIS

Scripts para o **Console Python do QGIS** que baixam e vetorizam automaticamente:

- **Limite municipal** de Canguaretama/RN
- **Áreas urbanas** (manchas de uso residencial/comercial/industrial)
- **Edificações** (footprints de construções)
- Estrutura pronta para **lotes urbanos** (ver limitação importante abaixo)

Fonte dos dados: [OpenStreetMap](https://www.openstreetmap.org/copyright) via
Nominatim (limite municipal) e Overpass API (áreas urbanas e edificações).

## Como usar

1. Abra o QGIS e vá em **Plugins → Console Python** (ou `Ctrl+Alt+P`).
2. Clique no ícone **"Abrir editor"** do console e depois **"Abrir script"**,
   apontando para `vetorizar_canguaretama.py`.
3. Ajuste, se quiser, as variáveis no topo do arquivo (seção `CONFIGURACAO`):
   - `PASTA_SAIDA`: onde o GeoPackage final será salvo (padrão:
     `~/Canguaretama_GIS/Canguaretama_RN.gpkg`)
   - `EMAIL_CONTATO`: exigido pela [política de uso do Nominatim](https://operations.osmfoundation.org/policies/nominatim/)
   - `URL_WFS_LOTES`: preencha apenas se você tiver acesso a um serviço WFS
     de cadastro urbano/lotes (ver abaixo)
4. Clique em **"Executar script"** (▶). O script chama `executar_tudo()`
   automaticamente ao final, que:
   1. Baixa o limite municipal
   2. Baixa as áreas urbanas
   3. Baixa as edificações
   4. Prepara a camada de lotes urbanos
   5. Grava tudo em um único GeoPackage (`Canguaretama_RN.gpkg`)

Também é possível colar o conteúdo do arquivo diretamente no console e depois
chamar as funções individualmente:

```python
camada_limite, osm_id, osm_type = baixar_limite_municipal()
area_id = _area_id_overpass(osm_id, osm_type)
baixar_areas_urbanas(area_id)
baixar_edificacoes(area_id)
preparar_lotes_urbanos()
```

## Sobre os "lotes urbanos"

Diferente do limite municipal, das áreas urbanas e das edificações, **lotes
urbanos individuais (parcelas de cadastro fundiário) não existem em bases
abertas como o OpenStreetMap** — esse tipo de dado normalmente só está
disponível no cadastro imobiliário da prefeitura (IPTU/planta de valores) ou
em infraestruturas de dados espaciais estaduais (ex.: IDE-RN, SEMARH-RN).

O script trata isso de duas formas:

- Se você tiver a URL de um serviço **WFS** com o cadastro de lotes de
  Canguaretama, informe em `URL_WFS_LOTES` no topo do script — o script
  tentará baixar e converter automaticamente.
- Caso contrário, o script cria uma camada `lotes_urbanos` vazia, já em modo
  de edição, com campos básicos (`identificador`, `logradouro`, `area_m2`,
  `situacao`), e adiciona uma imagem de satélite de alta resolução (Esri
  World Imagery) como plano de fundo, para digitalização manual assistida.
  Ative o *snapping* (**Digitalização Avançada → Ativar Edição/Snapping**)
  para garantir que os lotes fiquem topologicamente consistentes com as
  edificações e áreas urbanas já carregadas.

Para digitalização manual em maior escala, considere também o plugin
**Deepness** (extração assistida por IA a partir de imagens de satélite) ou
os módulos de **auto-trace/deslocamento com snapping** nativos do QGIS.

## Saída

Todas as camadas são consolidadas em:

```
~/Canguaretama_GIS/Canguaretama_RN.gpkg
  ├── limite_municipal
  ├── areas_urbanas
  ├── edificacoes
  └── lotes_urbanos
```

Um passo opcional (`reprojetar_camadas_para_sirgas`) exporta cópias das
camadas em **SIRGAS 2000 / UTM 25S (EPSG:31985)**, sistema recomendado para
medições oficiais de área/perímetro no Rio Grande do Norte.

## Observações

- As consultas usam a Overpass API pública (com espelhos de *fallback*) e o
  Nominatim público — sujeitos a limite de requisições. Para uso intensivo
  ou repetido, considere hospedar sua própria instância Overpass/Nominatim.
- Os dados refletem o que está mapeado no OpenStreetMap na data da consulta;
  áreas rurais ou bairros pouco mapeados podem ter poucas ou nenhuma
  edificação retornada.
- Sempre credite o OpenStreetMap e seus colaboradores ao publicar mapas ou
  análises derivadas destes dados (© OpenStreetMap contributors).
