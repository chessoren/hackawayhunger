import { useMemo, useState } from 'react';
import { Users, BadgeCheck, CalendarCheck, Clock, Download, Map as MapIcon, Bus, Building2, HandHeart, Landmark, Newspaper } from 'lucide-react';
import { Layout, Stat } from '../components/ui';
import MiniIowa, { LEVEL_COLOR, LEVEL_LABEL } from '../components/MiniIowa';
import { useDB } from '../app/store';
import { countyOpportunities, CountyOpportunity, GAP_HOURS, SHARE_NEED_VOLUNTEER, SHARE_SUBJECT } from '../core/deserts';
import { ASSUMPTION_SOURCES, DEFAULT_ASSUMPTIONS, ImpactAssumptions, computeImpact, kSafe, usd } from '../core/impact';
import { shifts } from '../core/ledger';

export default function Dashboard() {
  const db = useDB();
  const rows = useMemo(() => countyOpportunities(db.sites), [db.sites]);
  const [picked, setPicked] = useState<CountyOpportunity | null>(null);
  const [a, setA] = useState<ImpactAssumptions>(DEFAULT_ASSUMPTIONS);
  const impact = computeImpact(a);

  const sessions = Object.values(db.sessions);
  const exemptions = sessions.filter((s) => s.decision && ['exempt', 'likely_exempt'].includes(s.decision.outcome)).length;
  const verifiedHours = shifts(db.ledger).filter((s) => s.status === 'validated').reduce((x, s) => x + s.hours, 0);
  const onPlan = sessions.filter((s) => s.decision?.outcome === 'subject').length;
  const count = (l: CountyOpportunity['level']) => rows.filter((r) => r.level === l).length;

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
    <Layout wide title="Impact & opportunity deserts" search="Iowa · 99 counties · anonymized, k ≥ 10">
      <div className="grid four" style={{ marginBottom: 18 }}>
        <div className="panel tight"><Stat value={<span className="big-number" style={{ fontSize: '2.6rem' }}>{kSafe(sessions.length)}</span>} label="People supported (live)" icon={Users} /></div>
        <div className="panel tight"><Stat value={<span className="big-number" style={{ fontSize: '2.6rem' }}>{kSafe(exemptions)}</span>} label="Recognized as exempt" icon={BadgeCheck} /></div>
        <div className="panel tight"><Stat value={<span className="big-number" style={{ fontSize: '2.6rem' }}>{kSafe(onPlan)}</span>} label="Covered, on a plan" icon={CalendarCheck} /></div>
        <div className="panel tight"><Stat value={<span className="big-number" style={{ fontSize: '2.6rem' }}>{verifiedHours}</span>} label="Volunteer hours verified" icon={Clock} /></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.35fr) minmax(0,0.65fr)', gap: 18 }}>
        <section className="map-panel" style={{ minHeight: 640 }}>
          <MiniIowa interactive onPick={setPicked} picked={picked?.fips} />
          <div className="map-overlay tl">
            <div className="row">
              <div className="search" style={{ maxWidth: 'none', flex: 1 }}><span className="ibtn sm blue"><MapIcon size={17} /></span>Where 80 hours are out of reach without a car</div>
            </div>
            <div className="row" style={{ marginTop: 14, justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="legend">
                {(['desert', 'tight', 'ok'] as const).map((l) => (
                  <span key={l} className="pill white"><span style={{ width: 12, height: 12, borderRadius: 4, background: LEVEL_COLOR[l] }} />{LEVEL_LABEL[l]} · {count(l)}</span>
                ))}
              </div>
              <div className="center" style={{ background: 'rgba(255,255,255,.85)', borderRadius: 22, padding: '10px 18px' }}>
                <div className="big-number">{count('desert')}</div>
                <span className="pill yellow">Deserts</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="panel">
            {picked ? (
              <>
                <div className="row"><h2 style={{ margin: 0 }}>{picked.name}</h2><span className="pill" style={{ background: LEVEL_COLOR[picked.level] }}>{LEVEL_LABEL[picked.level]}</span></div>
                <div className="stats" style={{ gap: 26, margin: '18px 0' }}>
                  <Stat value={`${Math.round(picked.ratio * 100)}%`} label="Coverage" icon={MapIcon} />
                  <Stat value={picked.accessibleHours.toLocaleString()} label="Car-free h/mo" icon={Bus} />
                  <Stat value={picked.hoursNeeded.toLocaleString()} label="Needed h/mo" icon={Clock} />
                </div>
                <table><tbody>
                  <tr><td className="muted">Population</td><td><b>{picked.population.toLocaleString()}</b></td></tr>
                  <tr><td className="muted">SNAP participants (est.)</td><td><b>{kSafe(picked.snapParticipants)}</b></td></tr>
                  <tr><td className="muted">Newly subject to 80 h (est.)</td><td><b>{kSafe(picked.peopleSubject)}</b></td></tr>
                  <tr><td className="muted">Host sites in Count Me In</td><td><b>{picked.registeredSites}</b></td></tr>
                </tbody></table>
                <p className="muted" style={{ marginTop: 12 }}>{picked.level === 'desert' ? 'Recruit host sites on transit lines, add a mobile pantry or shuttle — or document a geographic waiver.' : 'Keep recruiting weekday and off-peak missions.'}</p>
              </>
            ) : (
              <>
                <h2>{count('desert')} of 99 counties</h2>
                <p className="muted">are opportunity deserts: car-free accessible volunteer hours cover less than half of what people subject to the rule need. Tap a county.</p>
              </>
            )}
            <button className="btn flat small" onClick={download}><Download size={16} />County data (CSV)</button>
          </div>
          <div className="panel">
            <h3>Who uses this map</h3>
            {[
              [HandHeart, 'Food banks & pantries', 'Where to open the next host site'],
              [Building2, 'Funders & companies', 'Measurable impact in meals and dollars'],
              [Landmark, 'Officials & Iowa HHS', 'Counties under strain, failure reasons'],
              [Newspaper, 'Researchers & press', 'Aggregated, downloadable data'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof MapIcon;
              return <div key={t as string} className="row" style={{ marginTop: 12, flexWrap: 'nowrap' }}><span className="ibtn sm" style={{ background: 'var(--surface-2)' }}><I size={17} /></span><div><b>{t as string}</b><div className="muted" style={{ fontSize: '0.86rem' }}>{d as string}</div></div></div>;
            })}
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '0.8rem', marginTop: 12 }}>
        Model: SNAP participants = population × Iowa rate (247,907 recipients, Iowa HHS May 2026); subject = {Math.round(SHARE_SUBJECT * 100)}% of participants; {Math.round(SHARE_NEED_VOLUNTEER * 100)}% need ~{GAP_HOURS} volunteer h/month. Supply: ~1 volunteer-hosting organization per 1,200 residents × 150 h/month × car-free share (60% with fixed-route transit, 40% mid-size, 25% small rural counties), plus registered host sites. The pilot replaces the baseline with the live site registry and transit data.
      </p>

      <div className="section-title"><h2>Impact model</h2><span className="count">pilot scenario</span></div>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18 }}>
        <div className="panel dark">
          <span className="pill yellow">Food aid preserved / year</span>
          <div className="big-number" style={{ fontSize: '5rem', margin: '16px 0 6px' }}>{usd(impact.aidPreservedPerYear)}</div>
          <p className="muted">for {a.peopleSupported} people supported</p>
          <div className="tile" style={{ background: 'var(--dark-2)', color: '#fff', margin: '14px 0' }}>
            {a.peopleSupported} × {Math.round(a.shareWouldLose * 100)}% × {Math.round(a.shareKeptWithTool * 100)}% = <b>{impact.peopleKept} people keep SNAP</b><br />
            {impact.peopleKept} × ${a.avgMonthlyBenefit} × 12 = <b>{usd(impact.aidPreservedPerYear)}</b>
          </div>
          <div className="stats" style={{ gap: 30 }}>
            <Stat value={impact.mealsPreservedPerYear.toLocaleString()} label="Meals / year" />
            <Stat value={impact.volunteerHoursPerYear.toLocaleString()} label="Volunteer hours / year" />
            <Stat value={usd(impact.volunteerValuePerYear)} label="Value of time given" />
          </div>
        </div>
        <div className="panel">
          <h3>Assumptions — edit them</h3>
          <table><tbody>
            {([
              ['peopleSupported', 'People supported, year 1', 1],
              ['shareWouldLose', 'Would lose SNAP without a tool', 0.01],
              ['shareKeptWithTool', '…of whom keep it with the tool', 0.01],
              ['avgMonthlyBenefit', 'Avg monthly benefit ($)', 0.01],
              ['volunteerHoursPerMonth', 'Volunteer h / month per person', 1],
              ['costPerMeal', 'Cost per meal ($)', 0.01],
              ['volunteerHourValue', 'Value of a volunteer hour ($)', 0.01],
            ] as [keyof ImpactAssumptions, string, number][]).map(([k, label, step]) => (
              <tr key={k}>
                <td>{label}<br /><small>{ASSUMPTION_SOURCES[k]}</small></td>
                <td style={{ width: 120 }}><input type="number" step={step} value={a[k]} onChange={(e) => set(k, Number(e.target.value))} aria-label={label} /></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </Layout>
  );
}
