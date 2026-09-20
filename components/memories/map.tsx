'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Map as LibreMap,
  setWorkerUrl,
  type GeoJSONSource,
  type Map as MapType,
} from 'maplibre-gl';
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Bounds, Memory, Point } from '@/lib/types';
import { emotions } from '@/lib/types';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from '@/src/features/map/constants';

setWorkerUrl(mapLibreWorkerUrl);
export type MapHandle = {
  flyTo: (point: Point, zoom?: number) => void;
  center: () => Point;
  zoom: (delta: number) => void;
};
export default function MemoryMap({
  memories,
  onBounds,
  onSelect,
  onCreate,
  draftPoint,
  highlightedIds,
  selectedMemoryId,
  mapRef,
}: {
  memories: Memory[];
  onBounds: (bounds: Bounds) => void;
  onSelect: (memory: Memory) => void;
  onCreate: (point: Point) => void;
  draftPoint: Point | null;
  highlightedIds: string[];
  selectedMemoryId: string | null;
  mapRef: React.RefObject<MapHandle | null>;
}) {
  const container = useRef<HTMLElement>(null);
  const map = useRef<MapType | null>(null);
  const callbacks = useRef({ onBounds, onSelect, onCreate, memories });
  useEffect(() => {
    callbacks.current = { onBounds, onSelect, onCreate, memories };
  }, [onBounds, onSelect, onCreate, memories]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let instance: MapType;
    try {
      const configuredStyle = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
      instance = new LibreMap({
        container: container.current,
        style: configuredStyle || {
          version: 8,
          sources: {
            basemap: {
              type: 'raster',
              tiles: [
                'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
            },
          },
          layers: [
            {
              id: 'base',
              type: 'raster',
              source: 'basemap',
              paint: { 'raster-saturation': -0.6, 'raster-opacity': 0.82 },
            },
          ],
        },
        center: [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat],
        zoom: DEFAULT_MAP_ZOOM,
        minZoom: 3,
        maxZoom: 19,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });
    } catch {
      queueMicrotask(() => setError(true));
      return;
    }
    map.current = instance;
    mapRef.current = {
      flyTo: (p, zoom = 15) =>
        instance.flyTo({ center: [p.lng, p.lat], zoom, duration: 1000 }),
      center: () => ({
        lng: instance.getCenter().lng,
        lat: instance.getCenter().lat,
      }),
      zoom: (d) => instance.zoomTo(instance.getZoom() + d),
    };
    const report = () => {
      const b = instance.getBounds();
      callbacks.current.onBounds({
        west: Math.max(-180, b.getWest()),
        south: Math.max(-85, b.getSouth()),
        east: Math.min(180, b.getEast()),
        north: Math.min(85, b.getNorth()),
      });
    };
    instance.on('load', () => {
      instance.addSource('draft-location', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      instance.addLayer({
        id: 'draft-location-halo',
        type: 'circle',
        source: 'draft-location',
        paint: {
          'circle-color': '#486555',
          'circle-radius': 20,
          'circle-opacity': 0.18,
        },
      });
      instance.addLayer({
        id: 'draft-location-point',
        type: 'circle',
        source: 'draft-location',
        paint: {
          'circle-color': '#486555',
          'circle-radius': 7,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fffefa',
        },
      });
      instance.addSource('memories', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 42,
      });
      instance.addLayer({
        id: 'trace-halo',
        type: 'circle',
        source: 'memories',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': [
            'case',
            ['get', 'selected'],
            27,
            ['get', 'grouped'],
            23,
            20,
          ],
          'circle-opacity': [
            'case',
            ['get', 'selected'],
            0.28,
            ['get', 'grouped'],
            0.22,
            0.17,
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.3,
        },
      });
      instance.addLayer({
        id: 'traces',
        type: 'circle',
        source: 'memories',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': [
            'case',
            ['get', 'selected'],
            9,
            ['get', 'grouped'],
            8,
            7,
          ],
          'circle-stroke-width': ['case', ['get', 'selected'], 4, 3],
          'circle-stroke-color': '#fffefa',
        },
      });
      instance.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'memories',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#56745d',
          'circle-radius': ['step', ['get', 'point_count'], 19, 10, 24, 50, 30],
          'circle-opacity': 0.88,
          'circle-stroke-width': 6,
          'circle-stroke-color': '#56745d',
          'circle-stroke-opacity': 0.15,
        },
      });
      setReady(true);
      report();
    });
    instance.on('moveend', report);
    instance.on('error', () => setError(true));
    instance.on('idle', () => setError(false));
    let suppressUntil = 0;
    let press: ReturnType<typeof setTimeout> | undefined;
    let start: { x: number; y: number } | null = null;
    const stop = () => {
      if (press) clearTimeout(press);
      press = undefined;
    };
    instance.on('touchstart', (e) => {
      if (e.points.length !== 1) return;
      start = e.points[0];
      press = setTimeout(() => {
        suppressUntil = Date.now() + 800;
        callbacks.current.onCreate({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      }, 650);
    });
    instance.on('touchmove', (e) => {
      if (
        !start ||
        !e.points[0] ||
        Math.hypot(e.points[0].x - start.x, e.points[0].y - start.y) > 8
      )
        stop();
    });
    instance.on('touchend', stop);
    instance.on('dragstart', stop);
    instance.on('contextmenu', (event) => {
      callbacks.current.onCreate({
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
      });
    });
    instance.on('click', async (e) => {
      if (Date.now() < suppressUntil) return;
      const features = instance.getLayer('traces')
        ? instance.queryRenderedFeatures(e.point, {
            layers: ['traces', 'trace-halo', 'clusters'],
          })
        : [];
      const f = features[0];
      if (f?.properties?.cluster) {
        const zoom = await (
          instance.getSource('memories') as GeoJSONSource
        ).getClusterExpansionZoom(Number(f.properties.cluster_id));
        if (f.geometry.type === 'Point')
          instance.easeTo({
            center: f.geometry.coordinates as [number, number],
            zoom,
          });
        return;
      }
      if (f) {
        const memory = callbacks.current.memories.find(
          (m) => m.id === f.properties.id,
        );
        if (memory) callbacks.current.onSelect(memory);
        return;
      }
      callbacks.current.onCreate({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });
    return () => {
      stop();
      mapRef.current = null;
      map.current = null;
      instance.remove();
    };
  }, [mapRef]);
  useEffect(() => {
    if (!ready || !map.current) return;
    void (map.current.getSource('memories') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: memories.map((m) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [m.lng, m.lat] },
        properties: {
          id: m.id,
          color: emotions[m.emotion].color,
          grouped: highlightedIds.includes(m.id),
          selected: m.id === selectedMemoryId,
        },
      })),
    });
  }, [highlightedIds, memories, ready, selectedMemoryId]);
  useEffect(() => {
    if (!ready || !map.current) return;
    void (map.current.getSource('draft-location') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: draftPoint
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [draftPoint.lng, draftPoint.lat],
              },
              properties: {},
            },
          ]
        : [],
    });
  }, [draftPoint, ready]);
  return (
    <>
      <section
        ref={container}
        className="map-surface"
        aria-label="기억 지도. 지점을 클릭하거나 길게 눌러 기억을 남기세요."
      />
      {error && (
        <output className="map-error">
          지도를 불러오지 못했어요. 연결을 확인해 주세요.
        </output>
      )}
    </>
  );
}
