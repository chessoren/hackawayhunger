import { Phone, AlertTriangle, Check } from 'lucide-react';
import { Layout } from '../components/ui';
import { update, useDB, useNow } from '../app/store';
import { monthlyCount } from '../core/agent';

/** Human relay: escalations and people at risk of missing their month. */
export default function Navigator() {
  const db = useDB();
  const clock = useNow();
  const open = db.tickets.filter((t) => !t.done).reverse();
  const atRisk = Object.values(db.sessions)
    .filter((s) => s.decision?.outcome === 'subject')
    .map((s) => ({ s, c: monthlyCount(s, db.ledger, clock) }))
    .filter(({ c }) => c.gap - c.booked > 0)
    .sort((a, b) => b.c.gap - a.c.gap);

  return (
    <Layout>
      <h1 className="display" style={{ fontSize: '3.2rem', margin: 0 }}>Navigators</h1>
      <div className="subtitle">A human is always one word away</div>
      <div className="row" style={{ margin: '10px 0 22px' }}><span className="pill yellow">{open.length} open requests</span><span className="pill blue">{atRisk.length} at risk</span></div>
      <div className="grid two">
        <section className="panel">
          <div className="row"><span className="ibtn yellow"><Phone size={19} /></span><h2 style={{ margin: 0 }}>Open requests</h2></div>
          <div style={{ marginTop: 16 }}>
            {!open.length && <div className="tile muted">Nothing waiting.</div>}
            {open.map((t) => (
              <div key={t.id} className="vol-row">
                <span className="avatar">{(t.name ?? '?').charAt(0)}</span>
                <div><div className="name">{t.name ?? 'Unknown'}</div><div>{t.reason}</div><small>{new Date(t.at).toLocaleString('en-US')} · {t.phone || 'host site'}</small></div>
                <button className="btn lime small" onClick={() => update((d) => { const x = d.tickets.find((y) => y.id === t.id); if (x) x.done = true; })}><Check size={15} />Called</button>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="row"><span className="ibtn blue"><AlertTriangle size={19} /></span><h2 style={{ margin: 0 }}>At risk this month</h2></div>
          <p className="muted" style={{ marginTop: 10 }}>Hours still missing after counting bookings. The agent nudges first; a human calls when it is not enough.</p>
          {atRisk.map(({ s, c }) => (
            <div key={s.person} className="vol-row">
              <span className="avatar" style={{ background: 'var(--blue)' }}>{(s.name ?? '?').charAt(0)}</span>
              <div><div className="name">{s.name}</div><div className="muted">{c.done} / 80 h · {c.booked} h booked</div></div>
              <span className={`pill ${c.gap - c.booked > 30 ? 'coral' : 'yellow'}`}>{c.gap - c.booked} h unplanned</span>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}
