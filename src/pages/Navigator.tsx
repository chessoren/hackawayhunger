import { Layout } from '../components/ui';
import { update, useDB, useNow } from '../app/store';
import { monthlyCount } from '../core/agent';

/** Human relay: escalations and people at risk of missing their month. */
export default function Navigator() {
  const db = useDB();
  const clock = useNow();
  const open = db.tickets.filter((t) => !t.done).reverse();
  const people = Object.values(db.sessions).filter((s) => s.decision?.outcome === 'subject');
  const atRisk = people
    .map((s) => ({ s, c: monthlyCount(s, db.ledger, clock) }))
    .filter(({ c }) => c.gap - c.booked > 0)
    .sort((a, b) => b.c.gap - a.c.gap);

  return (
    <Layout>
      <h1>Navigator console</h1>
      <p className="lead">“Talk to someone” is always one word away. Partner navigators see escalations and people at risk — with only what they need to help.</p>
      <div className="grid two">
        <div className="card">
          <h2>Open requests ({open.length})</h2>
          {!open.length && <p className="muted">Nothing waiting.</p>}
          {open.map((t) => (
            <div key={t.id} className="vol-row">
              <div>
                <div className="name">{t.name ?? 'Unknown'}</div>
                <div>{t.reason}</div>
                <small>{new Date(t.at).toLocaleString('en-US')} · {t.phone || 'host site'}</small>
              </div>
              <button className="btn small" onClick={() => update((d) => { const x = d.tickets.find((y) => y.id === t.id); if (x) x.done = true; })}>Mark called</button>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>At risk this month ({atRisk.length})</h2>
          <p className="muted">Hours still missing after counting bookings. The agent nudges first; a human calls when it is not enough.</p>
          {atRisk.map(({ s, c }) => (
            <div key={s.person} className="vol-row">
              <div>
                <div className="name">{s.name}</div>
                <div>{c.done} / 80 h · {c.booked} h booked · <strong style={{ color: 'var(--orange-700)' }}>{c.gap - c.booked} h unplanned</strong></div>
              </div>
              <span className={`pill ${c.gap - c.booked > 30 ? 'red' : 'orange'}`}>{c.gap - c.booked > 30 ? 'High risk' : 'Watch'}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
