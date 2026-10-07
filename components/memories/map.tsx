'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as LibreMap,
  setWorkerUrl,
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
const CALM_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const MAPLIBRE_WORLD_TILE_SIZE = 512;
const RASTER_TILE_SIZE = 256;

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

function project(
  point: Point,
  zoom: number,
  tileSize = MAPLIBRE_WORLD_TILE_SIZE,
) {
  const size = tileSize * 2 ** zoom;
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
  mode,
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
  mode: 'calm' | 'detail';
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
  const callbacks = useRef({ onBounds, onCreate });
  useEffect(() => {
    callbacks.current = { onBounds, onCreate };
  }, [onBounds, onCreate]);
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
        // OpenFreeMap Positron is the quiet default style. It is based on
        // OpenStreetMap, requires no API key, and keeps parks, major roads and
        // administrative labels legible without the density of the detailed
        // OSM raster layer. The compatibility layer below remains available
        // as the detailed option and as the WebGL/network fallback.
        style: CALM_MAP_STYLE_URL,
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
      // Memory, selection and current-location markers are rendered once by
      // the shared HTML overlay below. Keeping them out of the base style
      // guarantees identical markers in calm and detailed map modes.
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
    instance.on('click', (e) => {
      if (Date.now() < suppressUntil) return;
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
  const rasterTiles = useMemo(() => {
    if (!view.width || !view.height) return [];
    // MapLibre measures the world using 512px tiles, while OSM Standard uses
    // 256px raster tiles. Advancing the raster source by one zoom level keeps
    // both modes at the exact same geographic scale and viewport.
    const rasterZoom = view.zoom + Math.log2(MAPLIBRE_WORLD_TILE_SIZE / RASTER_TILE_SIZE);
    const z = Math.max(3, Math.min(19, Math.floor(rasterZoom)));
    const scale = 2 ** (rasterZoom - z);
    const tileSize = RASTER_TILE_SIZE * scale;
    const center = project(view.center, z, RASTER_TILE_SIZE);
    const minX = Math.floor(center.x / RASTER_TILE_SIZE - view.width / (2 * tileSize)) - 1;
    const maxX = Math.ceil(center.x / RASTER_TILE_SIZE + view.width / (2 * tileSize)) + 1;
    const minY = Math.max(0, Math.floor(center.y / RASTER_TILE_SIZE - view.height / (2 * tileSize)) - 1);
    const edge = 2 ** z;
    const maxY = Math.min(edge - 1, Math.ceil(center.y / RASTER_TILE_SIZE + view.height / (2 * tileSize)) + 1);
    const tiles: Array<{ key: string; src: string; left: number; top: number; size: number }> = [];
    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const wrappedX = ((x % edge) + edge) % edge;
        tiles.push({
          key: `${z}:${x}:${y}`,
          // Include the source revision so browsers and the edge cache cannot
          // reuse tiles left by the previous provider at the same route.
          src: `/api/map-tiles/${z}/${wrappedX}/${y}?source=${MAP_TILE_SOURCE_REVISION}`,
          left: view.width / 2 + (x * RASTER_TILE_SIZE - center.x) * scale,
          top: view.height / 2 + (y * RASTER_TILE_SIZE - center.y) * scale,
          size: tileSize,
        });
      }
    }
    return tiles;
  }, [view]);
  const showRasterTiles = mode === 'detail' || error || !ready;

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

  const draftLocationPosition = useMemo(() => {
    if (!draftPoint || !view.width || !view.height) return null;
    const center = project(view.center, view.zoom);
    const point = project(draftPoint, view.zoom);
    const x = view.width / 2 + point.x - center.x;
    const y = view.height / 2 + point.y - center.y;
    if (x < -60 || y < -60 || x > view.width + 60 || y > view.height + 60) {
      return null;
    }
    return { x, y };
  }, [draftPoint, view]);

  return (
    <>
      <section
        ref={container}
        className="map-surface"
        aria-label="기억 지도. 지점을 클릭하거나 길게 눌러 기억을 남기세요."
      />
      <div
        ref={rasterContainer}
        className={`map-surface raster-map ${!showRasterTiles ? 'vector-visible' : ''} ${mode === 'calm' ? 'calm-mode' : 'detail-mode'}`}
        aria-label="지도 위 기억 마커"
      >
        {showRasterTiles && rasterTiles.map((tile) => (
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
          const grouped = group.memories.some((item) => highlightedIds.includes(item.id));
          return (
            <button
              key={group.memories.map((item) => item.id).join(':')}
              className={`raster-memory-marker${selected ? ' selected' : grouped ? ' grouped' : ''}`}
              style={{ left: group.x, top: group.y, '--marker-color': color } as React.CSSProperties}
              aria-label={group.memories.length > 1 ? `${memory.location_name}의 기억 ${group.memories.length}개` : memory.title}
              onClick={() => onSelect(memory)}
            >
              {group.memories.length > 1 ? group.memories.length : ''}
            </button>
          );
        })}
        {draftLocationPosition && (
          <span
            className="raster-draft-location"
            role="img"
            aria-label="선택한 기억 위치"
            style={{
              left: draftLocationPosition.x,
              top: draftLocationPosition.y,
            }}
          />
        )}
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
        <span className="raster-attribution">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            © OpenStreetMap contributors
          </a>
          {mode === 'calm' && (
            <>
              {' · '}
              <a
                href="https://www.openmaptiles.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                © OpenMapTiles
              </a>
              {' · '}
              <a
                href="https://openfreemap.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenFreeMap
              </a>
            </>
          )}
        </span>
      </div>
      {error && (
        <output className="map-error">
          지도를 불러오지 못했어요. 연결을 확인해 주세요.
        </output>
      )}
    </>
  );
}
