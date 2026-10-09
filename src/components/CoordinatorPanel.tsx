import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { getDB, now, record, update, useDB, useNow } from '../app/store';
import { notifyValidated } from '../app/runtime';
import { Shift, hoursBetween, shifts, verifyChain } from '../core/ledger';
import { MISSION_LABEL } from '../data/sites';
import { fingerprint } from '../core/crypto';
import { DEFAULT_ASSUMPTIONS, usd } from '../core/impact';
import { Check, PenLine, UserX, Clock, Users, DollarSign, AlertCircle, Download, Printer, ShieldCheck, ShieldAlert, ListChecks, BarChart3, QrCode, ScrollText, UserPlus } from 'lucide-react';
import { Stat } from './ui';

const t = (iso?: string | unknown) => (iso ? new Date(String(iso)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—');
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function firstName(s: Shift) {
  return String(s.booked?.data.firstName || s.checkIn?.data.firstName || 'Volunteer');
}

export default function CoordinatorPanel({ siteId: initial, compact }: { siteId?: string; compact?: boolean }) {
  const db = useDB();
  const clock = useNow();
  const [siteId, setSiteId] = useState(initial ?? 'grace');
  const [tab, setTab] = useState<'today' | 'report' | 'poster' | 'audit'>('today');
  const site = db.sites.find((s) => s.id === siteId) ?? db.sites[0];
  const all = useMemo(() => shifts(db.ledger).filter((s) => s.siteId === site.id), [db.ledger, site.id]);
  const today = all.filter((s) => sameDay(new Date(s.occurrence), clock)).sort((a, b) => a.occurrence.localeCompare(b.occurrence));
  const upcoming = all.filter((s) => new Date(s.occurrence) > clock && !sameDay(new Date(s.occurrence), clock));

  useEffect(() => { if (initial) setSiteId(initial); }, [initial]);

  function validate(s: Shift, hoursOverride?: number) {
    const slot = site.slots.find((x) => x.id === s.slotId)!;
    const start = new Date(s.occurrence);
    const [eh, em] = slot.end.split(':').map(Number);
    const end = new Date(start);
    end.setHours(eh, em, 0, 0);
    const inAt = String(s.checkIn?.data.at ?? start.toISOString());
    const outAt = String(s.checkOut?.data.at ?? (now() < end ? now().toISOString() : end.toISOString()));
    const hours = hoursOverride ?? Math.max(0.25, hoursBetween(inAt, outAt));
    const keys = getDB().siteKeys[site.id];
    record({ type: 'validation', person: s.person, siteId: site.id, slotId: s.slotId, occurrence: s.occurrence, data: { hours, in: inAt, out: outAt, coordinator: site.coordinator, mission: MISSION_LABEL[slot.mission] } }, keys);
    void notifyValidated(s.person, hours, site.coordinator);
  }

  function noShow(s: Shift) {
    record({ type: 'no_show', person: s.person, siteId: site.id, slotId: s.slotId, occurrence: s.occurrence, data: { by: site.coordinator } }, getDB().siteKeys[site.id]);
  }

  return (
    <div className="panel" style={compact ? { padding: 22 } : undefined}>
      <div className="row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="label">Coordinator · {site.coordinator}</div>
          <select aria-label="Host site" value={site.id} onChange={(e) => setSiteId(e.target.value)} style={{ fontWeight: 800, fontSize: '1.15rem', marginTop: 4, background: 'var(--surface-2)' }}>
            {db.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="row" role="tablist" style={{ background: 'var(--surface-2)', padding: 5, borderRadius: 16, gap: 4 }}>
          {([['today', 'Today', ListChecks], ['report', 'Report', BarChart3], ['poster', 'QR poster', QrCode], ['audit', 'Audit', ScrollText]] as const).map(([k, label, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`btn small ${tab === k ? 'blue' : 'ghost'}`} onClick={() => setTab(k)}><Icon size={15} />{label}</button>
          ))}
        </div>
      </div>

      {tab === 'today' && (
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{clock.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            <span className="pill yellow">{today.length} expected</span>
          </div>
          {!today.length && <div className="tile muted">No volunteers booked today. {upcoming.length ? `${upcoming.length} upcoming booking(s) this month.` : ''}</div>}
          {today.map((s) => {
            const slot = site.slots.find((x) => x.id === s.slotId);
            const late = s.status === 'booked' && clock.getTime() > new Date(s.occurrence).getTime() + 20 * 60000;
            return (
              <div key={s.person + s.occurrence} className={`vol-row ${s.status}`}>
                <span className="avatar">{firstName(s).charAt(0)}</span>
                <div>
                  <div className="name">{firstName(s)}</div>
                  <div className="muted" style={{ fontSize: '0.88rem' }}>{slot && `${MISSION_LABEL[slot.mission]} · ${slot.start}–${slot.end}`}</div>
                  <div style={{ marginTop: 6 }}>
                    {s.status === 'booked' && <span className={`pill ${late ? 'coral' : ''}`}>{late ? 'Late — no check-in' : 'Expected'}</span>}
                    {s.status === 'arrived' && <span className="pill blue">Arrived {t(s.checkIn?.data.at)}</span>}
                    {s.status === 'left' && <span className="pill yellow">{t(s.checkIn?.data.at)} → {t(s.checkOut?.data.at)} · to confirm</span>}
                    {s.status === 'validated' && <span className="pill lime"><Check size={13} />{s.hours} h confirmed</span>}
                    {s.status === 'no_show' && <span className="pill coral">No-show · waitlist notified</span>}
                  </div>
                </div>
                <div className="row">
                  {(s.status === 'left' || s.status === 'arrived') && (
                    <>
                      <button className="btn lime big" onClick={() => validate(s)} aria-label={`Confirm hours for ${firstName(s)}`}><Check size={20} />Confirm</button>
                      <button className="ibtn" aria-label="Correct hours" title="Correct hours" onClick={() => { const h = prompt('Correct hours (e.g. 3.5):'); if (h) validate(s, Number(h)); }}><PenLine size={18} /></button>
                    </>
                  )}
                  {late && <button className="btn flat small" onClick={() => noShow(s)}><UserX size={15} />No-show</button>}
                </div>
              </div>
            );
          })}
          <p className="muted" style={{ marginTop: 14, fontSize: '0.84rem' }}>
            You only see a first name and a slot — never why someone volunteers, never their SNAP file. Confirmations are signed with this site's key ({fingerprint(db.siteKeys[site.id]?.publicKey ?? '')}).
          </p>
          {!compact && (
            <button className="btn flat small" onClick={() => update((d) => { d.tickets.push({ id: Math.random().toString(36).slice(2), phone: '', name: site.coordinator, reason: `Need volunteers at ${site.name}`, at: now(d).toISOString() }); })}><UserPlus size={15} />Request more volunteers</button>
          )}
        </div>
      )}

      {tab === 'report' && <Report siteId={site.id} />}
      {tab === 'poster' && <Poster code={site.code} name={site.name} />}
      {tab === 'audit' && <Audit siteId={site.id} />}
    </div>
  );
}

function Report({ siteId }: { siteId: string }) {
  const db = useDB();
  const clock = useNow();
  const month = clock.toISOString().slice(0, 7);
  const site = db.sites.find((s) => s.id === siteId)!;
  const v = shifts(db.ledger).filter((s) => s.siteId === siteId && s.status === 'validated' && s.occurrence.startsWith(month));
  const hours = v.reduce((a, s) => a + s.hours, 0);
  const people = new Set(v.map((s) => s.person)).size;
  const noShows = shifts(db.ledger).filter((s) => s.siteId === siteId && s.status === 'no_show' && s.occurrence.startsWith(month)).length;
  const csv = () => {
    const rows = [['date', 'mission', 'first_name', 'hours', 'ledger_hash'], ...v.map((s) => [s.occurrence.slice(0, 10), String(s.validation?.data.mission ?? ''), firstName(s), String(s.hours), s.validation?.hash ?? ''])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `count-me-in-${siteId}-${month}.csv`;
    a.click();
  };
  return (
    <div>
      <h3>{site.name} — {clock.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
      <div className="grid four" style={{ margin: '14px 0' }}>
        <div className="tile"><Stat value={hours} label="Hours received" icon={Clock} /></div>
        <div className="tile"><Stat value={people} label="Volunteers" icon={Users} /></div>
        <div className="tile"><Stat value={usd(hours * DEFAULT_ASSUMPTIONS.volunteerHourValue)} label="Value of time" icon={DollarSign} /></div>
        <div className="tile"><Stat value={noShows} label="No-shows" icon={AlertCircle} /></div>
      </div>
      <p className="muted" style={{ fontSize: '0.86rem' }}>Ready to attach to a grant application. Value uses the Independent Sector hourly value of volunteer time (${DEFAULT_ASSUMPTIONS.volunteerHourValue}).</p>
      <div className="row"><button className="btn flat small" onClick={csv}><Download size={15} />CSV</button><button className="btn flat small" onClick={() => window.print()}><Printer size={15} />Print</button></div>
    </div>
  );
}

function Poster({ code, name }: { code: string; name: string }) {
  const [src, setSrc] = useState('');
  const url = `${window.location.origin}/c/${code}`;
  useEffect(() => { QRCode.toDataURL(url, { width: 520, margin: 1, color: { dark: '#0c0c0d' } }).then(setSrc); }, [url]);
  return (
    <div>
      <div className="poster">
        <span className="pill yellow">Volunteers · check in here</span>
        <h2 style={{ marginTop: 14, fontSize: '2.4rem' }}>Count Me In</h2>
        <p>Scan when you <b>arrive</b> and when you <b>leave</b>.<br />Hours confirmed by {name}.</p>
        {src && <img src={src} alt={`QR code to check in at ${name}`} style={{ width: 240, height: 240, borderRadius: 20 }} />}
        <p style={{ marginTop: 12 }}>No smartphone? Text this code to <b>(515) 800-8080</b></p>
        <div className="code-big">{code}</div>
        <p className="muted">Escanee · Scannez · Changanua · امسح</p>
      </div>
      <div className="row no-print" style={{ justifyContent: 'center', marginTop: 14 }}><button className="btn dark" onClick={() => window.print()}><Printer size={17} />Print poster</button></div>
    </div>
  );
}

function Audit({ siteId }: { siteId: string }) {
  const db = useDB();
  const check = verifyChain(db.ledger);
  const entries = db.ledger.filter((e) => e.siteId === siteId).slice(-25).reverse();
  return (
    <div>
      <p>{check.ok ? <span className="pill lime"><ShieldCheck size={14} />Ledger intact — {db.ledger.length} entries, every link and signature verified</span> : <span className="pill coral"><ShieldAlert size={14} />Ledger broken at #{check.brokenAt}: {check.reason}</span>}</p>
      <table>
        <thead><tr><th>#</th><th>Time</th><th>Event</th><th>Person (pseudonym)</th><th>Hash</th><th>Signed</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.seq}><td>{e.seq}</td><td>{new Date(e.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td><td><span className="pill">{e.type.replace('_', ' ')}</span></td><td><code>{e.person.slice(0, 10)}</code></td><td><code>{e.hash.slice(0, 12)}…</code></td><td>{e.sig ? <span className="pill lime">coordinator</span> : '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
