import { useMemo, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import geo from '../data/iowa-counties.geo.json';
import { useDB } from '../app/store';
import { CountyOpportunity, countyOpportunities } from '../core/deserts';

export const LEVEL_COLOR: Record<CountyOpportunity['level'], string> = { desert: '#f4a62a', tight: '#f8e25b', ok: '#d5f08c' };
export const LEVEL_LABEL: Record<CountyOpportunity['level'], string> = { desert: 'Opportunity desert', tight: 'Tight', ok: 'Enough hours' };

type Ring = [number, number][];
type Geom = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };

const W = 1000;
const H = 640;
// Iowa bounding box (lon/lat), equirectangular with latitude correction.
const LON0 = -96.65, LON1 = -90.1, LAT0 = 40.35, LAT1 = 43.53;
const kx = Math.cos((41.9 * Math.PI) / 180);
const sx = (W - 40) / ((LON1 - LON0) * kx);
const sy = (H - 40) / (LAT1 - LAT0);
const s = Math.min(sx, sy);
const ox = (W - (LON1 - LON0) * kx * s) / 2;
const oy = (H - (LAT1 - LAT0) * s) / 2;
const px = ([lon, lat]: [number, number]) => `${(ox + (lon - LON0) * kx * s).toFixed(1)},${(oy + (LAT1 - lat) * s).toFixed(1)}`;

function pathOf(g: Geom): string {
  const polys: Ring[][] = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.map((poly) => poly.map((ring) => 'M' + ring.map(px).join('L') + 'Z').join('')).join('');
}

/** Iowa's 99 counties drawn from public county boundaries — no basemap, no third-party tiles. */
export default function MiniIowa({ onPick, picked, interactive = false }: { onPick?: (c: CountyOpportunity) => void; picked?: string; interactive?: boolean }) {
  const db = useDB();
  const rows = useMemo(() => countyOpportunities(db.sites), [db.sites]);
  const byFips = useMemo(() => new Map(rows.map((r) => [r.fips, r])), [rows]);
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState<CountyOpportunity | null>(null);
  const features = (geo as unknown as { features: { id: string; geometry: Geom }[] }).features;

  return (
    <div style={{ position: 'absolute', inset: interactive ? '70px 0 0 0' : '190px 10px 80px 10px', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of Iowa counties by opportunity-desert level"
        style={{ transform: `scale(${zoom})`, transition: 'transform 0.3s', transformOrigin: '50% 60%', }}>
        {features.map((f) => {
          const r = byFips.get(String(f.id));
          if (!r) return null;
          const on = picked === r.fips || hover?.fips === r.fips;
          return (
            <path key={f.id} d={pathOf(f.geometry)} fill={LEVEL_COLOR[r.level]} stroke={on ? '#0c0c0d' : '#ffffff'} strokeWidth={on ? 3 : 1.6}
              style={{ cursor: onPick ? 'pointer' : 'default' }}
              onMouseEnter={() => setHover(r)} onMouseLeave={() => setHover(null)} onClick={() => onPick?.(r)}>
              <title>{`${r.name} County — ${LEVEL_LABEL[r.level]} (${Math.round(r.ratio * 100)}%)`}</title>
            </path>
          );
        })}
      </svg>
      {interactive && (
        <div className="map-overlay br">
          <button className="ibtn raised" aria-label="Zoom in" onClick={() => setZoom(Math.min(2.4, zoom + 0.3))}><Plus size={20} /></button>
          <button className="ibtn raised" aria-label="Zoom out" onClick={() => setZoom(Math.max(1, zoom - 0.3))}><Minus size={20} /></button>
        </div>
      )}
      {interactive && hover && (
        <div className="map-overlay" style={{ left: 18, bottom: 18 }}>
          <div className="panel tight" style={{ padding: '10px 14px' }}><b>{hover.name} County</b> <span className="pill" style={{ background: LEVEL_COLOR[hover.level] }}>{Math.round(hover.ratio * 100)}%</span></div>
        </div>
      )}
    </div>
  );
}
