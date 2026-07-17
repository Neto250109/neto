# -*- coding: utf-8 -*-
"""
Vetorizacao automatica de Canguaretama/RN para o Console Python do QGIS.

O que este script baixa e carrega no projeto:
  1. Limite municipal (via Nominatim/OpenStreetMap)
  2. Areas urbanas - manchas de uso residencial/comercial/industrial (via Overpass API)
  3. Edificacoes (via Overpass API)
  4. Um layer vazio e editavel "lotes_urbanos" + imagem de satelite de fundo,
     pronto para digitalizacao manual (loteamento/parcelas nao existem em
     bases publicas como OSM - ver README.md para detalhes)

Como usar:
  1. Abra o QGIS -> Console Python (Ctrl+Alt+P)
  2. Ajuste as variaveis na secao CONFIGURACAO abaixo, se necessario
  3. Cole todo este arquivo no console e pressione Enter (ou use o botao
     "Executar script" apontando para este .py)
  4. Ao final, chame executar_tudo() ou as funcoes individuais listadas
     em "Uso individual" no fim do arquivo
"""

import json
import os
import urllib.parse
import urllib.request

from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsRasterLayer,
    QgsFields,
    QgsField,
    QgsWkbTypes,
    QgsCoordinateReferenceSystem,
    QgsVectorFileWriter,
)
from qgis.PyQt.QtCore import QVariant

try:
    from qgis.utils import iface
except ImportError:
    iface = None

try:
    import processing
except ImportError:
    processing = None


# =============================================================================
# CONFIGURACAO
# =============================================================================

# Nome de busca do municipio (Nominatim)
MUNICIPIO_BUSCA = "Canguaretama, Rio Grande do Norte, Brasil"

# Pasta de saida (GeoPackage final e camadas intermediarias)
PASTA_SAIDA = os.path.join(os.path.expanduser("~"), "Canguaretama_GIS")

# GeoPackage final consolidado
GPKG_SAIDA = os.path.join(PASTA_SAIDA, "Canguaretama_RN.gpkg")

# E-mail de contato exigido pela politica de uso do Nominatim
# (https://operations.osmfoundation.org/policies/nominatim/)
EMAIL_CONTATO = "joseluizneto.geo@gmail.com"

# CRS de trabalho (WGS84, mesmo do OSM)
CRS_WGS84 = "EPSG:4326"

# CRS projetado recomendado para medidas de area/perimetro no RN
# (SIRGAS 2000 / UTM zona 25S)
CRS_PROJETADO = "EPSG:31985"

# Se voce tiver uma URL de servico WFS de lotes/cadastro urbano (geoportal da
# Prefeitura de Canguaretama, IDE-RN, SEMARH-RN etc.), cole aqui. Deixe vazio
# para pular direto para a digitalizacao manual assistida por imagem de satelite.
URL_WFS_LOTES = ""

# Espelhos publicos da Overpass API (tenta em ordem ate um responder)
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]


# =============================================================================
# FUNCOES AUXILIARES DE REDE
# =============================================================================

def _log(msg):
    print(msg)
    if iface is not None:
        try:
            iface.messageBar().pushMessage("Canguaretama", msg, level=0, duration=4)
        except Exception:
            pass


def _consultar_overpass(query, timeout=180):
    """Envia uma query Overpass QL e retorna o JSON decodificado."""
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    ultimo_erro = None
    for url in OVERPASS_ENDPOINTS:
        try:
            req = urllib.request.Request(
                url, data=data, headers={"User-Agent": "QGIS-Canguaretama/1.0"}
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:  # tenta o proximo espelho
            ultimo_erro = exc
            _log(f"Falha em {url}: {exc}. Tentando proximo espelho...")
    raise RuntimeError(f"Nao foi possivel consultar a Overpass API: {ultimo_erro}")


def _buscar_municipio_nominatim(nome_busca):
    """Busca o municipio no Nominatim e retorna (geojson_geom, osm_id, osm_type)."""
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": nome_busca,
        "format": "jsonv2",
        "polygon_geojson": 1,
        "limit": 1,
        "email": EMAIL_CONTATO,
    }
    req = urllib.request.Request(
        url + "?" + urllib.parse.urlencode(params),
        headers={"User-Agent": "QGIS-Canguaretama/1.0"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        dados = json.loads(resp.read().decode("utf-8"))
    if not dados:
        raise RuntimeError(f"Nenhum resultado encontrado para '{nome_busca}' no Nominatim.")
    resultado = dados[0]
    return resultado["geojson"], int(resultado["osm_id"]), resultado["osm_type"]


def _area_id_overpass(osm_id, osm_type):
    """Converte id/tipo do Nominatim para o id de 'area' usado pela Overpass API."""
    if osm_type == "relation":
        return 3600000000 + osm_id
    if osm_type == "way":
        return 2400000000 + osm_id
    raise RuntimeError(
        f"Tipo OSM inesperado para o municipio: '{osm_type}' (esperado relation/way)."
    )


# =============================================================================
# MONTAGEM DE GEOMETRIAS (ways/relations Overpass -> GeoJSON)
# =============================================================================

def _montar_aneis(segmentos):
    """Costura segmentos (listas de coordenadas [lon,lat]) em aneis fechados."""
    segs = [[tuple(p) for p in s] for s in segmentos if len(s) >= 2]
    aneis = []
    while segs:
        anel = segs.pop(0)
        mudou = True
        while anel[0] != anel[-1] and mudou:
            mudou = False
            for i, seg in enumerate(segs):
                if seg[0] == anel[-1]:
                    anel = anel + seg[1:]
                    segs.pop(i)
                    mudou = True
                    break
                if seg[-1] == anel[-1]:
                    anel = anel + list(reversed(seg))[1:]
                    segs.pop(i)
                    mudou = True
                    break
                if seg[-1] == anel[0]:
                    anel = seg[:-1] + anel
                    segs.pop(i)
                    mudou = True
                    break
                if seg[0] == anel[0]:
                    anel = list(reversed(seg))[:-1] + anel
                    segs.pop(i)
                    mudou = True
                    break
        if anel[0] != anel[-1]:
            anel = anel + [anel[0]]
        aneis.append([list(p) for p in anel])
    return aneis


def _elementos_para_geojson(elementos):
    """Converte elementos Overpass (ways/relations com 'out geom;') em FeatureCollection."""
    features = []
    for el in elementos:
        tags = el.get("tags", {})
        geometry = None

        if el["type"] == "way":
            geom = el.get("geometry")
            if not geom or len(geom) < 4:
                continue
            coords = [[p["lon"], p["lat"]] for p in geom]
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            geometry = {"type": "Polygon", "coordinates": [coords]}

        elif el["type"] == "relation":
            outer_segs, inner_segs = [], []
            for m in el.get("members", []):
                if m.get("type") != "way" or "geometry" not in m:
                    continue
                coords = [[p["lon"], p["lat"]] for p in m["geometry"]]
                (inner_segs if m.get("role") == "inner" else outer_segs).append(coords)
            outer_rings = _montar_aneis(outer_segs)
            inner_rings = _montar_aneis(inner_segs)
            if not outer_rings:
                continue
            poligonos = []
            for i, anel in enumerate(outer_rings):
                buracos = inner_rings if i == 0 else []
                poligonos.append([anel] + buracos)
            geometry = (
                {"type": "Polygon", "coordinates": poligonos[0]}
                if len(poligonos) == 1
                else {"type": "MultiPolygon", "coordinates": poligonos}
            )
        else:
            continue

        props = dict(tags)
        props["osm_id"] = el["id"]
        props["osm_type"] = el["type"]
        features.append({"type": "Feature", "geometry": geometry, "properties": props})

    return {"type": "FeatureCollection", "features": features}


def _salvar_geojson(geojson_dict, caminho):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(geojson_dict, f)


def _carregar_camada(caminho, nome):
    camada = QgsVectorLayer(caminho, nome, "ogr")
    if not camada.isValid():
        raise RuntimeError(f"Falha ao carregar a camada '{nome}' a partir de {caminho}")
    QgsProject.instance().addMapLayer(camada)
    return camada


def _exportar_para_gpkg(camada, camada_saida_nome, sobrescrever_gpkg=False):
    """Exporta/anexa uma camada de memoria/OGR ao GeoPackage consolidado."""
    os.makedirs(PASTA_SAIDA, exist_ok=True)
    opcoes = QgsVectorFileWriter.SaveVectorOptions()
    opcoes.driverName = "GPKG"
    opcoes.layerName = camada_saida_nome
    opcoes.actionOnExistingFile = (
        QgsVectorFileWriter.CreateOrOverwriteFile
        if sobrescrever_gpkg or not os.path.exists(GPKG_SAIDA)
        else QgsVectorFileWriter.CreateOrOverwriteLayer
    )
    erro = QgsVectorFileWriter.writeAsVectorFormatV3(
        camada,
        GPKG_SAIDA,
        QgsProject.instance().transformContext(),
        opcoes,
    )
    if erro[0] != QgsVectorFileWriter.NoError:
        raise RuntimeError(f"Erro ao exportar '{camada_saida_nome}' para GeoPackage: {erro}")
    _log(f"Camada '{camada_saida_nome}' gravada em {GPKG_SAIDA}")


# =============================================================================
# ETAPA 1 - LIMITE MUNICIPAL
# =============================================================================

def baixar_limite_municipal():
    _log("Buscando limite municipal de Canguaretama/RN no Nominatim...")
    geojson_geom, osm_id, osm_type = _buscar_municipio_nominatim(MUNICIPIO_BUSCA)

    geojson_fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": geojson_geom,
                "properties": {
                    "municipio": "Canguaretama",
                    "uf": "RN",
                    "osm_id": osm_id,
                    "osm_type": osm_type,
                },
            }
        ],
    }
    caminho = os.path.join(PASTA_SAIDA, "limite_municipal.geojson")
    _salvar_geojson(geojson_fc, caminho)
    camada = _carregar_camada(caminho, "limite_municipal")
    _exportar_para_gpkg(camada, "limite_municipal", sobrescrever_gpkg=True)

    _log(f"Limite municipal carregado ({camada.featureCount()} feicao(oes)).")
    return camada, osm_id, osm_type


# =============================================================================
# ETAPA 2 - AREAS URBANAS (landuse) E EDIFICACOES (buildings)
# =============================================================================

def baixar_areas_urbanas(area_id):
    _log("Consultando areas urbanas (landuse) via Overpass API...")
    query = f"""
    [out:json][timeout:180];
    area({area_id})->.a;
    (
      way["landuse"~"^(residential|commercial|industrial|retail)$"](area.a);
      relation["landuse"~"^(residential|commercial|industrial|retail)$"](area.a);
    );
    out geom;
    """
    dados = _consultar_overpass(query)
    fc = _elementos_para_geojson(dados["elements"])
    caminho = os.path.join(PASTA_SAIDA, "areas_urbanas.geojson")
    _salvar_geojson(fc, caminho)
    camada = _carregar_camada(caminho, "areas_urbanas")
    _exportar_para_gpkg(camada, "areas_urbanas")
    _log(f"Areas urbanas carregadas ({camada.featureCount()} poligono(s)).")
    return camada


def baixar_edificacoes(area_id):
    _log("Consultando edificacoes (buildings) via Overpass API...")
    query = f"""
    [out:json][timeout:180];
    area({area_id})->.a;
    (
      way["building"](area.a);
      relation["building"](area.a);
    );
    out geom;
    """
    dados = _consultar_overpass(query)
    fc = _elementos_para_geojson(dados["elements"])
    caminho = os.path.join(PASTA_SAIDA, "edificacoes.geojson")
    _salvar_geojson(fc, caminho)
    camada = _carregar_camada(caminho, "edificacoes")
    _exportar_para_gpkg(camada, "edificacoes")
    _log(f"Edificacoes carregadas ({camada.featureCount()} poligono(s)).")
    return camada


# =============================================================================
# ETAPA 3 - LOTES URBANOS
#
# IMPORTANTE: parcelas/lotes urbanos individuais NAO existem em bases abertas
# como o OpenStreetMap - isso e cadastro fundiario, normalmente disponivel
# apenas no geoportal da prefeitura ou em orgaos estaduais (ex.: IDE-RN,
# SEMARH-RN, cartorios). Se voce tiver uma URL WFS desse cadastro, preencha
# URL_WFS_LOTES no topo do arquivo. Caso contrario, este script prepara tudo
# para digitalizacao manual: camada editavel + imagem de satelite de fundo.
# =============================================================================

def adicionar_imagem_satelite():
    url = (
        "type=xyz&url=https://server.arcgisonline.com/ArcGIS/rest/services/"
        "World_Imagery/MapServer/tile/%7Bz%7D/%7By%7D/%7Bx%7D&zmax=19&zmin=0"
    )
    camada = QgsRasterLayer(url, "Esri World Imagery", "wms")
    if camada.isValid():
        QgsProject.instance().addMapLayer(camada)
        _log("Imagem de satelite (Esri World Imagery) adicionada como fundo.")
    else:
        _log("Nao foi possivel carregar a imagem de satelite de fundo.")
    return camada


def preparar_lotes_urbanos():
    if URL_WFS_LOTES:
        _log("Tentando carregar lotes urbanos a partir do WFS informado...")
        camada = QgsVectorLayer(URL_WFS_LOTES, "lotes_urbanos", "WFS")
        if camada.isValid() and camada.featureCount() > 0:
            QgsProject.instance().addMapLayer(camada)
            _exportar_para_gpkg(camada, "lotes_urbanos")
            _log(f"Lotes urbanos carregados do WFS ({camada.featureCount()} feicoes).")
            return camada
        _log("WFS informado nao retornou dados validos. Preparando digitalizacao manual.")

    _log(
        "Nao ha fonte publica de lotes urbanos para Canguaretama/RN. "
        "Criando camada editavel para digitalizacao manual sobre imagem de satelite."
    )
    fields = QgsFields()
    fields.append(QgsField("identificador", QVariant.String))
    fields.append(QgsField("logradouro", QVariant.String))
    fields.append(QgsField("area_m2", QVariant.Double))
    fields.append(QgsField("situacao", QVariant.String))

    camada = QgsVectorLayer(f"Polygon?crs={CRS_WGS84}", "lotes_urbanos", "memory")
    dp = camada.dataProvider()
    dp.addAttributes(fields)
    camada.updateFields()
    QgsProject.instance().addMapLayer(camada)

    os.makedirs(PASTA_SAIDA, exist_ok=True)
    opcoes = QgsVectorFileWriter.SaveVectorOptions()
    opcoes.driverName = "GPKG"
    opcoes.layerName = "lotes_urbanos"
    opcoes.actionOnExistingFile = (
        QgsVectorFileWriter.CreateOrOverwriteFile
        if not os.path.exists(GPKG_SAIDA)
        else QgsVectorFileWriter.CreateOrOverwriteLayer
    )
    QgsVectorFileWriter.writeAsVectorFormatV3(
        camada, GPKG_SAIDA, QgsProject.instance().transformContext(), opcoes
    )

    adicionar_imagem_satelite()
    camada.startEditing()
    _log(
        "Camada 'lotes_urbanos' pronta e em modo de edicao. Ative o snapping "
        "(menu Digitalizacao Avancada) e trace os lotes sobre a imagem de satelite."
    )
    return camada


# =============================================================================
# ETAPA OPCIONAL - REPROJETAR PARA SIRGAS 2000 / UTM 25S
# =============================================================================

def reprojetar_camadas_para_sirgas(nomes_camadas=("limite_municipal", "areas_urbanas", "edificacoes")):
    if processing is None:
        _log("Modulo 'processing' indisponivel; pulando reprojecao.")
        return
    for nome in nomes_camadas:
        camadas = QgsProject.instance().mapLayersByName(nome)
        if not camadas:
            continue
        saida = os.path.join(PASTA_SAIDA, f"{nome}_sirgas2000.gpkg")
        processing.run(
            "native:reprojectlayer",
            {
                "INPUT": camadas[0],
                "TARGET_CRS": QgsCoordinateReferenceSystem(CRS_PROJETADO),
                "OUTPUT": saida,
            },
        )
        _log(f"'{nome}' reprojetado para {CRS_PROJETADO} em {saida}")


# =============================================================================
# EXECUCAO COMPLETA
# =============================================================================

def executar_tudo():
    os.makedirs(PASTA_SAIDA, exist_ok=True)
    _, osm_id, osm_type = baixar_limite_municipal()
    area_id = _area_id_overpass(osm_id, osm_type)
    baixar_areas_urbanas(area_id)
    baixar_edificacoes(area_id)
    preparar_lotes_urbanos()
    _log(f"Concluido. GeoPackage consolidado em: {GPKG_SAIDA}")


# =============================================================================
# Uso individual (cole o arquivo inteiro no console e depois chame o que
# precisar, por exemplo):
#
#   camada_limite, osm_id, osm_type = baixar_limite_municipal()
#   area_id = _area_id_overpass(osm_id, osm_type)
#   baixar_areas_urbanas(area_id)
#   baixar_edificacoes(area_id)
#   preparar_lotes_urbanos()
#
# Ou simplesmente:
#
#   executar_tudo()
# =============================================================================

executar_tudo()
