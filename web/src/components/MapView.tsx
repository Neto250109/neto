import { useEffect, useRef, useState } from "react";
import { Map as MLMap, NavigationControl, Popup, LngLatBounds, type StyleSpecification, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import { SEQUENTIAL_GREEN } from "../lib/colors";

export interface MapDatum {
  codigo: string;
  valor: number | null;
  tooltip: string;
  /** Cor já resolvida (ex.: classificação categórica). Quando ausente, a cor é
   * calculada a partir de `valor` numa escala sequencial contínua. */
  cor?: string;
}

export interface LegendItem {
  color: string;
  label: string;
}

let geoCache: FeatureCollection | null = null;
async function loadGeo(): Promise<FeatureCollection> {
  if (geoCache) return geoCache;
  const topo = (await fetch(`${import.meta.env.BASE_URL}data/municipios_br.topojson`).then((r) => r.json())) as Topology;
  const objName = Object.keys(topo.objects)[0];
  const fc = topojson.feature(topo, topo.objects[objName] as GeometryCollection) as unknown as FeatureCollection;
  geoCache = fc;
  return fc;
}

const EMPTY_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#eef1f0" } }],
};

export default function MapView({
  dados,
  onClickMunicipio,
  ufFilter,
  height = 560,
  legendTitle = "IDEB",
  legendMin = 0,
  legendMax = 10,
  legendItems,
}: {
  dados: Map<string, MapDatum>;
  onClickMunicipio?: (codigo: string) => void;
  ufFilter?: string | null;
  height?: number;
  legendTitle?: string;
  legendMin?: number;
  legendMax?: number;
  /** Quando fornecido, mostra legenda categórica (swatches) em vez do gradiente contínuo. */
  legendItems?: LegendItem[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const dadosRef = useRef<Map<string, MapDatum>>(dados);
  const removedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const onClickMunicipioRef = useRef(onClickMunicipio);
  onClickMunicipioRef.current = onClickMunicipio;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MLMap({
      container: containerRef.current,
      style: EMPTY_STYLE,
      center: [-52, -14],
      zoom: 3.1,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    popupRef.current = new Popup({ closeButton: false, closeOnClick: false, maxWidth: "280px" });

    map.on("load", async () => {
      const geo = await loadGeo();
      if (removedRef.current) return;
      map.addSource("municipios", { type: "geojson", data: geo, promoteId: "id" });
      map.addLayer({
        id: "mun-fill",
        type: "fill",
        source: "municipios",
        paint: {
          "fill-color": ["coalesce", ["feature-state", "cor"], "#d8dcd8"],
          "fill-opacity": 0.92,
        },
      });
      map.addLayer({
        id: "mun-line",
        type: "line",
        source: "municipios",
        paint: { "line-color": "#ffffff", "line-width": 0.25 },
      });
      map.addLayer({
        id: "mun-hover-line",
        type: "line",
        source: "municipios",
        paint: { "line-color": "#0b0b0b", "line-width": 1.6 },
        filter: ["==", ["get", "id"], ""],
      });
      setLoaded(true);
    });

    map.on("mousemove", "mun-fill", (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const f = e.features[0];
      const id = String(f.properties?.id ?? f.id);
      map.getCanvas().style.cursor = "pointer";
      map.setFilter("mun-hover-line", ["==", ["get", "id"], id]);
      const datum = dadosRef.current.get(id);
      if (datum) {
        popupRef.current!.setLngLat(e.lngLat).setHTML(datum.tooltip).addTo(map);
      }
    });
    map.on("mouseleave", "mun-fill", () => {
      map.getCanvas().style.cursor = "";
      map.setFilter("mun-hover-line", ["==", ["get", "id"], ""]);
      popupRef.current?.remove();
    });
    map.on("click", "mun-fill", (e: MapLayerMouseEvent) => {
      if (!e.features?.length) return;
      const id = String(e.features[0].properties?.id ?? e.features[0].id);
      onClickMunicipioRef.current?.(id);
    });

    return () => {
      removedRef.current = true;
      map.remove();
    };
  }, []);

  // aplica cores conforme dados mudam
  useEffect(() => {
    dadosRef.current = dados;
    const map = mapRef.current;
    if (!map || !loaded) return;
    const src = map.getSource("municipios") as GeoJSONSource | undefined;
    if (!src) return;
    let cancelled = false;
    loadGeo().then((geo) => {
      if (cancelled || removedRef.current) return;
      for (const feat of geo.features) {
        const id = String((feat.properties as Record<string, unknown>)?.id ?? feat.id);
        const datum = dados.get(id);
        const cor = datum?.cor ?? (datum && datum.valor !== null ? colorFor(datum.valor, legendMin, legendMax) : "#d8dcd8");
        map.setFeatureState({ source: "municipios", id }, { cor });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dados, loaded, legendMin, legendMax]);

  // filtro por UF: enquadra o mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (!ufFilter) {
      map.easeTo({ center: [-52, -14], zoom: 3.1 });
      return;
    }
    loadGeo().then((geo) => {
      if (removedRef.current) return;
      const feats = geo.features.filter((f) => dados.has(String((f.properties as Record<string, unknown>)?.id ?? f.id)));
      if (!feats.length) return;
      const bounds = new LngLatBounds();
      for (const f of feats) {
        const coords = f.geometry.type === "Polygon" ? f.geometry.coordinates.flat(1) : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.flat(2) : [];
        for (const c of coords) bounds.extend(c as [number, number]);
      }
      map.fitBounds(bounds, { padding: 30, duration: 400 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ufFilter, loaded]);

  return (
    <div style={{ position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height, borderRadius: 8, overflow: "hidden" }} />
      <div
        className="card"
        style={{ position: "absolute", bottom: 10, left: 10, padding: "8px 10px", fontSize: 11.5, zIndex: 5 }}
      >
        <div style={{ marginBottom: 4, fontWeight: 600 }}>{legendTitle}</div>
        {legendItems ? (
          <div style={{ display: "grid", gap: 3 }}>
            {legendItems.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color, display: "inline-block" }} />
                <span>{it.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>{legendMin.toFixed(1)}</span>
            <div style={{ width: 110, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${SEQUENTIAL_GREEN.join(",")})` }} />
            <span>{legendMax.toFixed(1)}</span>
          </div>
        )}
        <div className="muted" style={{ marginTop: 3 }}>
          cinza = sem dado disponível
        </div>
      </div>
      {!loaded && (
        <div className="muted" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          Carregando geometria municipal…
        </div>
      )}
    </div>
  );
}

function colorFor(v: number, lo: number, hi: number): string {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
  const idx = Math.round(t * (SEQUENTIAL_GREEN.length - 1));
  return SEQUENTIAL_GREEN[idx];
}
