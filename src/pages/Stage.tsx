import { useState } from 'react';
import { Layout, Gauge } from '../components/ui';
import PhoneSim from '../components/PhoneSim';
import CoordinatorPanel from '../components/CoordinatorPanel';
import { setClock, update, useDB, useNow, getDB } from '../app/store';
import { deliverProactive, send } from '../app/runtime';
import { myPhone } from './Phone';
import { monthlyCount } from '../core/agent';

/** Side-by-side demo: the person's phone, the coordinator's screen, and a demo clock. */
export default function Stage() {
  const db = useDB();
  const clock = useNow(5000);
  const phone = myPhone();
  const s = db.sessions[phone];
  const next = s?.bookings.filter((b) => new Date(b.end) > clock).sort((a, b) => a.occurrence.localeCompare(b.occurrence))[0];
  const [busy, setBusy] = useState(false);
  const c = s ? monthlyCount(s, db.ledger, clock) : null;

  async function jump(to: Date) {
    setClock(to);
    await deliverProactive(phone);
  }
  async function scan() {
    if (!next) return;
    setBusy(true);
    await send(phone, { text: next.code });
    setBusy(false);
  }

  return (
    <Layout wide>
      <div className="clockbar no-print" style={{ marginBottom: 18 }}>
        <strong>🕒 Demo clock:</strong>
        <span>{clock.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        <span className="spacer" />
        {next && (
          <>
            <button className="btn small secondary" onClick={() => { const d = new Date(next.occurrence); d.setDate(d.getDate() - 1); d.setHours(18, 0, 0, 0); jump(d); }}>Evening before</button>
            <button className="btn small" onClick={() => jump(new Date(new Date(next.occurrence).getTime() + 2 * 60000))}>⏩ Shift starts</button>
            <button className="btn small" onClick={() => jump(new Date(new Date(next.end).getTime() - 1 * 60000))}>⏩ Shift ends</button>
          </>
        )}
        <button className="btn small secondary" onClick={() => { const d = new Date(clock); d.setDate(20); d.setHours(10, 0, 0, 0); jump(d); }}>The 20th</button>
        <button className="btn small ghost" onClick={() => jump(new Date())}>Real time</button>
        <button className="btn small ghost" onClick={() => { if (confirm('Restart Linda\'s conversation?')) update((d) => { delete d.threads[phone]; delete d.sessions[phone]; d.ledger = d.ledger.filter((e) => e.person !== getDB().sessions[phone]?.person); d.clockOffsetMs = 0; }); }}>Restart</button>
      </div>
      <div className="stage">
        <div className="phone-wrap"><PhoneSim phone={phone} /></div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card row" style={{ gap: 20 }}>
            <Gauge done={c?.done ?? 0} size={130} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ marginBottom: 4 }}>{s?.name ?? 'The person'} — this month</h3>
              {c ? (
                <p className="muted" style={{ margin: 0 }}>{c.paid} h paid work · {c.training} h training · <strong style={{ color: 'var(--green)' }}>{c.volunteer} h volunteering confirmed</strong> · {c.booked} h booked</p>
              ) : <p className="muted">Start the conversation on the phone.</p>}
              {next && (
                <div className="row" style={{ marginTop: 10 }}>
                  <span className="pill">Next: {next.mission} · {next.siteName} · {new Date(next.occurrence).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
                  <button className="btn orange small" disabled={busy} onClick={scan}>📷 Scan the QR at the door</button>
                </div>
              )}
            </div>
          </div>
          <CoordinatorPanel siteId={next?.siteId ?? s?.bookings[0]?.siteId} compact />
        </div>
      </div>
    </Layout>
  );
}
