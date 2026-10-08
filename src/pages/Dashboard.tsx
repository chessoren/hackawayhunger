import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { Layout } from '../components/ui';
import { useDB } from '../app/store';
import geo from '../data/iowa-counties.geo.json';
import { countyOpportunities, CountyOpportunity, GAP_HOURS, SHARE_NEED_VOLUNTEER, SHARE_SUBJECT } from '../core/deserts';
import { ASSUMPTION_SOURCES, DEFAULT_ASSUMPTIONS, ImpactAssumptions, computeImpact, kSafe, usd } from '../core/impact';
import { shifts } from '../core/ledger';

const COLORS = { desert: '#c0392b', tight: '#f2a03d', ok: '#2e8b57' };

function IowaMap({ rows, onPick }: { rows: CountyOpportunity[]; onPick: (c: CountyOpportunity) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: false, zoomSnap: 0.1 }).setView([42.0, -93.4], 7);
    mapRef.current = map;
    const byFips = new Map(rows.map((r) => [r.fips, r]));
    const layer = L.geoJSON(geo as GeoJSON.FeatureCollection, {
      style: (f) => {
        const r = byFips.get(String(f?.id));
        return { color: '#ffffff', weight: 1, fillOpacity: 0.78, fillColor: r ? COLORS[r.level] : '#ccc' };
      },
      onEachFeature: (f, l) => {
        const r = byFips.get(String(f.id));
        if (!r) return;
        l.bindTooltip(`<strong>${r.name} County</strong><br/>Accessible hours / needed: ${(r.ratio * 100).toFixed(0)}%<br/>${r.fixedRouteTransit ? 'Fixed-route transit' : 'No fixed-route transit'}`, { sticky: true });
        l.on('click', () => onPick(r));
      },
    }).addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [10, 10] });
    return () => { map.remove(); };
  }, [rows, onPick]);
  return <div ref={ref} className="map" role="img" aria-label="Map of Iowa counties colored by opportunity desert level" />;
}

export default function Dashboard() {
  const db = useDB();
  const rows = useMemo(() => countyOpportunities(db.sites), [db.sites]);
  const [picked, setPicked] = useState<CountyOpportunity | null>(null);
  const [a, setA] = useState<ImpactAssumptions>(DEFAULT_ASSUMPTIONS);
  const impact = computeImpact(a);

  // Live counters from the ledger + sessions (aggregated, k ≥ 10).
  const sessions = Object.values(db.sessions);
  const exemptions = sessions.filter((s) => s.decision && ['exempt', 'likely_exempt'].includes(s.decision.outcome)).length;
  const all = shifts(db.ledger);
  const verifiedHours = all.filter((s) => s.status === 'validated').reduce((x, s) => x + s.hours, 0);
  const reached = sessions.filter((s) => s.decision?.outcome === 'subject').length;
  const deserts = rows.filter((r) => r.level === 'desert');
  const pick = useMemo(() => (c: CountyOpportunity) => setPicked(c), []);

  const download = () => {
    const header = 'fips,county,population,snap_participants_est,people_subject_est,hours_needed_month,accessible_hours_month,ratio,level';
    const lines = rows.map((r) => [r.fips, r.name, r.population, r.snapParticipants, r.peopleSubject, r.hoursNeeded, r.accessibleHours, r.ratio.toFixed(2), r.level].join(','));
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([[header, ...lines].join('\n')], { type: 'text/csv' }));
    el.download = 'count-me-in-iowa-opportunity-deserts.csv';
    el.click();
  };

  const set = (k: keyof ImpactAssumptions, v: number) => setA({ ...a, [k]: v });

  return (
    <Layout wide>
      <h1>Impact & opportunity deserts</h1>
      <p className="lead">Public and anonymized. Every number comes from a formula you can redo in your head. No cell shows fewer than 10 people.</p>

      <div className="grid four" style={{ marginBottom: 20 }}>
        <div className="card"><div className="stat">{kSafe(sessions.length)}</div><div className="stat-label">people supported this month (live)</div></div>
        <div className="card"><div className="stat">{kSafe(exemptions)}</div><div className="stat-label">recognized as exempt through screening</div></div>
        <div className="card"><div className="stat">{kSafe(reached)}</div><div className="stat-label">covered by the rule, on a plan</div></div>
        <div className="card"><div className="stat">{verifiedHours}</div><div className="stat-label">volunteer hours verified for host sites</div></div>
      </div>

      <div className="grid two">
        <div className="card">
          <div className="row"><h2 style={{ margin: 0 }}>Where 80 hours are impossible without a car</h2></div>
          <p className="muted">For each of Iowa's 99 counties: car-free accessible mission hours ÷ hours needed by people subject to the rule. Red = the obligation is mathematically out of reach for part of the population.</p>
          <IowaMap rows={rows} onPick={pick} />
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: COLORS.desert }} />Opportunity desert (&lt;50%)</span>
            <span><i style={{ background: COLORS.tight }} />Tight (60–100%)</span>
            <span><i style={{ background: COLORS.ok }} />Enough accessible hours</span>
          </div>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            {picked ? (
              <>
                <h2>{picked.name} County</h2>
                <table>
                  <tbody>
                    <tr><td>Population</td><td>{picked.population.toLocaleString()}</td></tr>
                    <tr><td>SNAP participants (est.)</td><td>{kSafe(picked.snapParticipants)}</td></tr>
                    <tr><td>Newly subject to 80 h (est.)</td><td>{kSafe(picked.peopleSubject)}</td></tr>
                    <tr><td>Volunteer hours needed / month</td><td>{picked.hoursNeeded.toLocaleString()}</td></tr>
                    <tr><td>Car-free accessible hours / month</td><td>{picked.accessibleHours.toLocaleString()}</td></tr>
                    <tr><td>Coverage</td><td><strong style={{ color: COLORS[picked.level] }}>{(picked.ratio * 100).toFixed(0)}%</strong></td></tr>
                    <tr><td>Host sites in Count Me In</td><td>{picked.registeredSites}</td></tr>
                  </tbody>
                </table>
                <p className="muted" style={{ marginTop: 8 }}>{picked.level === 'desert' ? 'Action: recruit host sites on transit lines, a mobile pantry, a shuttle — or document the case for a geographic waiver.' : 'Action: keep recruiting weekday and off-peak missions.'}</p>
              </>
            ) : (
              <>
                <h2>{deserts.length} of 99 counties are opportunity deserts</h2>
                <p>Click a county for details. Polk County includes every host site registered in Count Me In — register a site and watch the map change.</p>
              </>
            )}
            <button className="btn secondary small" onClick={download}>Download county data (CSV)</button>
          </div>
          <div className="card">
            <h3>Who uses this map</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>Food banks & pantries</strong> — where to open the next host site.</li>
              <li><strong>Funders (e.g. corporate volunteer programs)</strong> — measurable impact in meals and dollars.</li>
              <li><strong>Officials & Iowa HHS</strong> — counties under strain, success rates, failure reasons.</li>
              <li><strong>Researchers & press</strong> — aggregated, downloadable data.</li>
            </ul>
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
              Model: SNAP participants = population × Iowa rate (247,907 recipients, Iowa HHS May 2026); subject = {Math.round(SHARE_SUBJECT * 100)}% of participants; {Math.round(SHARE_NEED_VOLUNTEER * 100)}% need ~{GAP_HOURS} volunteer h/month. Supply baseline: ~1 volunteer-hosting organization per 1,200 residents × 150 h/month, × car-free share (60% with fixed-route transit, 40% mid-size, 25% small rural counties), plus registered sites. Pilot replaces the baseline with the live site registry and DART/HIRTA data.
            </p>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 30 }}>Impact model — pilot scenario</h2>
      <div className="grid two">
        <div className="card">
          <div className="stat" style={{ fontSize: '3rem' }}>{usd(impact.aidPreservedPerYear)}</div>
          <div className="stat-label">in food aid preserved per year for {a.peopleSupported} people supported</div>
          <p style={{ marginTop: 12 }}>
            {a.peopleSupported} × {Math.round(a.shareWouldLose * 100)}% × {Math.round(a.shareKeptWithTool * 100)}% = <strong>{impact.peopleKept} people keep SNAP</strong><br />
            {impact.peopleKept} × ${a.avgMonthlyBenefit} × 12 = <strong>{usd(impact.aidPreservedPerYear)}</strong>
          </p>
          <div className="grid three">
            <div><div className="stat">{impact.mealsPreservedPerYear.toLocaleString()}</div><div className="stat-label">meals preserved / year</div></div>
            <div><div className="stat">{impact.volunteerHoursPerYear.toLocaleString()}</div><div className="stat-label">volunteer hours for pantries / year</div></div>
            <div><div className="stat">{usd(impact.volunteerValuePerYear)}</div><div className="stat-label">value of time given</div></div>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>For a running cost of a few thousand dollars a year (SMS, AI, hosting).</p>
        </div>
        <div className="card">
          <h3>Assumptions (edit them)</h3>
          <table>
            <tbody>
              {([
                ['peopleSupported', 'People supported, year 1', 1],
                ['shareWouldLose', 'Share who would lose SNAP without a tool', 0.01],
                ['shareKeptWithTool', '…of whom keep it thanks to the tool', 0.01],
                ['avgMonthlyBenefit', 'Average monthly benefit per person ($)', 0.01],
                ['volunteerHoursPerMonth', 'Volunteer hours / month per person kept', 1],
                ['costPerMeal', 'Cost per meal ($)', 0.01],
                ['volunteerHourValue', 'Value of one volunteer hour ($)', 0.01],
              ] as [keyof ImpactAssumptions, string, number][]).map(([k, label, step]) => (
                <tr key={k}>
                  <td>{label}<br /><small>{ASSUMPTION_SOURCES[k]}</small></td>
                  <td style={{ width: 110 }}><input type="number" step={step} value={a[k]} onChange={(e) => set(k, Number(e.target.value))} aria-label={label} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
