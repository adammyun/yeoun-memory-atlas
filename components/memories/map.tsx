'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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
const MAP_TILE_SOURCE_REVISION = 'osm-standard-v1';

export type MapHandle = {
  flyTo: (point: Point, zoom?: number) => void;
  center: () => Point;
  zoom: (delta: number) => void;
};

const VIEWPORT_QUERY_PADDING = 0.3;

type ViewState = {
  center: Point;
  zoom: number;
  width: number;
  height: number;
};

function project(point: Point, zoom: number) {
  const size = 256 * 2 ** zoom;
  const sin = Math.sin((Math.max(-85, Math.min(85, point.lat)) * Math.PI) / 180);
  return {
    x: ((point.lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

function expandBounds(bounds: Bounds, padding = VIEWPORT_QUERY_PADDING): Bounds {
  const longitudePadding = (bounds.east - bounds.west) * padding;
  const latitudePadding = (bounds.north - bounds.south) * padding;
  return {
    west: Math.max(-180, bounds.west - longitudePadding),
    south: Math.max(-85, bounds.south - latitudePadding),
    east: Math.min(180, bounds.east + longitudePadding),
    north: Math.min(85, bounds.north + latitudePadding),
  };
}
export default function MemoryMap({
  memories,
  onBounds,
  onSelect,
  onCreate,
  draftPoint,
  currentLocation,
  highlightedIds,
  selectedMemoryId,
  mapRef,
}: {
  memories: Memory[];
  onBounds: (bounds: Bounds) => void;
  onSelect: (memory: Memory) => void;
  onCreate: (point: Point) => void;
  draftPoint: Point | null;
  currentLocation?: Point | null;
  highlightedIds: string[];
  selectedMemoryId: string | null;
  mapRef: React.RefObject<MapHandle | null>;
}) {
  const container = useRef<HTMLElement>(null);
  const rasterContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapType | null>(null);
  const callbacks = useRef({ onBounds, onSelect, onCreate, memories });
  useEffect(() => {
    callbacks.current = { onBounds, onSelect, onCreate, memories };
  }, [onBounds, onSelect, onCreate, memories]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [view, setView] = useState<ViewState>({
    center: DEFAULT_MAP_CENTER,
    zoom: DEFAULT_MAP_ZOOM,
    width: 0,
    height: 0,
  });
  // Keep this size sync independent from MapLibre's load lifecycle. Some
  // embedded browsers cannot finish WebGL initialization; the raster layer
  // still needs a real viewport so the map never collapses to a blank panel.
  useEffect(() => {
    const node = rasterContainer.current;
    if (!node) return;
    const syncSize = () => {
      const rect = node.getBoundingClientRect();
      setView((current) => ({
        ...current,
        width: rect.width,
        height: rect.height,
      }));
    };
    syncSize();
    const ownerWindow = node.ownerDocument.defaultView;
    const ResizeObserverClass = ownerWindow?.ResizeObserver;
    const resizeObserver = ResizeObserverClass
      ? new ResizeObserverClass(syncSize)
      : null;
    resizeObserver?.observe(node);
    ownerWindow?.addEventListener('resize', syncSize);
    ownerWindow?.addEventListener('load', syncSize);
    const layoutTimers = ownerWindow
      ? [
          ownerWindow.setTimeout(syncSize, 0),
          ownerWindow.setTimeout(syncSize, 250),
        ]
      : [];
    return () => {
      resizeObserver?.disconnect();
      ownerWindow?.removeEventListener('resize', syncSize);
      ownerWindow?.removeEventListener('load', syncSize);
      layoutTimers.forEach((timer) => ownerWindow?.clearTimeout(timer));
    };
  }, []);
  useEffect(() => {
    if (!container.current) return;
    let instance: MapType;
    try {
      instance = new LibreMap({
        container: container.current,
        // The visible raster tiles are rendered by the compatibility layer
        // below. Keep MapLibre on a provider-neutral background so an
        // accidentally configured third-party style cannot add a watermark
        // or reintroduce an API-key dependency.
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: 'base-background',
              type: 'background',
              paint: { 'background-color': '#e9ede5' },
            },
          ],
        },
        center: [DEFAULT_MAP_CENTER.lng, DEFAULT_MAP_CENTER.lat],
        zoom: DEFAULT_MAP_ZOOM,
        minZoom: 3,
        maxZoom: 19,
        renderWorldCopies: false,
        // The compatibility layer owns the single visible attribution link so
        // it stays readable above the mobile memory panel.
        attributionControl: false,
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
      callbacks.current.onBounds(expandBounds({
        west: Math.max(-180, b.getWest()),
        south: Math.max(-85, b.getSouth()),
        east: Math.min(180, b.getEast()),
        north: Math.min(85, b.getNorth()),
      }));
    };
    const syncView = () => {
      const center = instance.getCenter();
      const rect = instance.getContainer().getBoundingClientRect();
      setView({
        center: { lng: center.lng, lat: center.lat },
        zoom: instance.getZoom(),
        width: rect.width,
        height: rect.height,
      });
    };
    const mapContainer = instance.getContainer();
    const ownerWindow = mapContainer.ownerDocument.defaultView;
    let viewFrame: number | null = null;
    const scheduleViewSync = () => {
      if (!ownerWindow || viewFrame !== null) return;
      viewFrame = ownerWindow.requestAnimationFrame(() => {
        viewFrame = null;
        syncView();
      });
    };
    syncView();
    const ResizeObserverClass = mapContainer.ownerDocument.defaultView?.ResizeObserver;
    const resizeObserver = ResizeObserverClass
      ? new ResizeObserverClass(() => {
          instance.resize();
          scheduleViewSync();
        })
      : null;
    resizeObserver?.observe(mapContainer);
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
      instance.addSource('current-location', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      instance.addLayer({
        id: 'current-location-halo',
        type: 'circle',
        source: 'current-location',
        paint: {
          'circle-color': '#2676d9',
          'circle-radius': 17,
          'circle-opacity': 0.2,
        },
      });
      instance.addLayer({
        id: 'current-location-point',
        type: 'circle',
        source: 'current-location',
        paint: {
          'circle-color': '#2676d9',
          'circle-radius': 7,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
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
      syncView();
      report();
    });
    instance.on('move', scheduleViewSync);
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
      if (viewFrame !== null && ownerWindow) {
        ownerWindow.cancelAnimationFrame(viewFrame);
      }
      resizeObserver?.disconnect();
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
  useEffect(() => {
    if (!ready || !map.current) return;
    void (map.current.getSource('current-location') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: currentLocation
        ? [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [currentLocation.lng, currentLocation.lat],
              },
              properties: {},
            },
          ]
        : [],
    });
  }, [currentLocation, ready]);

  const rasterTiles = useMemo(() => {
    if (!view.width || !view.height) return [];
    const z = Math.max(3, Math.min(19, Math.floor(view.zoom)));
    const scale = 2 ** (view.zoom - z);
    const tileSize = 256 * scale;
    const center = project(view.center, z);
    const minX = Math.floor(center.x / 256 - view.width / (2 * tileSize)) - 1;
    const maxX = Math.ceil(center.x / 256 + view.width / (2 * tileSize)) + 1;
    const minY = Math.max(0, Math.floor(center.y / 256 - view.height / (2 * tileSize)) - 1);
    const edge = 2 ** z;
    const maxY = Math.min(edge - 1, Math.ceil(center.y / 256 + view.height / (2 * tileSize)) + 1);
    const tiles: Array<{ key: string; src: string; left: number; top: number; size: number }> = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const wrappedX = ((x % edge) + edge) % edge;
        tiles.push({
          key: `${z}:${x}:${y}`,
          // Include the source revision so browsers and the edge cache cannot
          // reuse tiles left by the previous provider at the same route.
          src: `/api/map-tiles/${z}/${wrappedX}/${y}?source=${MAP_TILE_SOURCE_REVISION}`,
          left: view.width / 2 + (x * 256 - center.x) * scale,
          top: view.height / 2 + (y * 256 - center.y) * scale,
          size: tileSize,
        });
      }
    }
    return tiles;
  }, [view]);

  const markerGroups = useMemo(() => {
    const center = project(view.center, view.zoom);
    const groups: Array<{ x: number; y: number; memories: Memory[] }> = [];
    for (const memory of memories) {
      const point = project(memory, view.zoom);
      const x = view.width / 2 + point.x - center.x;
      const y = view.height / 2 + point.y - center.y;
      if (x < -40 || y < -40 || x > view.width + 40 || y > view.height + 40) continue;
      const group = groups.find((item) => Math.hypot(item.x - x, item.y - y) < 34);
      if (group) group.memories.push(memory);
      else groups.push({ x, y, memories: [memory] });
    }
    return groups;
  }, [memories, view]);

  const currentLocationPosition = useMemo(() => {
    if (!currentLocation || !view.width || !view.height) return null;
    const center = project(view.center, view.zoom);
    const point = project(currentLocation, view.zoom);
    const x = view.width / 2 + point.x - center.x;
    const y = view.height / 2 + point.y - center.y;
    if (x < -60 || y < -60 || x > view.width + 60 || y > view.height + 60) {
      return null;
    }
    return { x, y };
  }, [currentLocation, view]);

  return (
    <>
      <section
        ref={container}
        className="map-surface"
        aria-label="기억 지도. 지점을 클릭하거나 길게 눌러 기억을 남기세요."
      />
      <div
        ref={rasterContainer}
        className="map-surface raster-map"
        aria-label="지도 위 기억 마커"
      >
        {rasterTiles.map((tile) => (
          // Raster tiles are decorative; map attribution is provided by MapLibre.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            draggable={false}
            style={{
              transform: `translate3d(${tile.left}px, ${tile.top}px, 0)`,
              width: tile.size + 1,
              height: tile.size + 1,
            }}
          />
        ))}
        {markerGroups.map((group) => {
          const memory = group.memories[0];
          const color = emotions[memory.emotion].color;
          const selected = group.memories.some((item) => item.id === selectedMemoryId);
          return (
            <button
              key={group.memories.map((item) => item.id).join(':')}
              className={`raster-memory-marker${selected ? ' selected' : ''}`}
              style={{ left: group.x, top: group.y, '--marker-color': color } as React.CSSProperties}
              aria-label={group.memories.length > 1 ? `${memory.location_name}의 기억 ${group.memories.length}개` : memory.title}
              onClick={() => onSelect(memory)}
            >
              {group.memories.length > 1 ? group.memories.length : ''}
            </button>
          );
        })}
        {currentLocationPosition && (
          <span
            className="raster-current-location"
            role="img"
            aria-label="현재 위치"
            style={{
              left: currentLocationPosition.x,
              top: currentLocationPosition.y,
            }}
          />
        )}
        <a
          className="raster-attribution"
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      </div>
      {error && (
        <output className="map-error">
          지도를 불러오지 못했어요. 연결을 확인해 주세요.
        </output>
      )}
    </>
  );
}
