import { useState } from 'react';
import { Clock, Briefcase, GraduationCap, HeartHandshake, CalendarClock, ScanLine, Moon, FastForward, CalendarDays, RotateCcw, Timer } from 'lucide-react';
import { Layout, Gauge, Stat } from '../components/ui';
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
      <div className="clockbar no-print">
        <Timer size={18} />
        <b>Demo clock</b>
        <span className="pill">{clock.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        <span className="spacer" />
        {next && (
          <>
            <button className="btn flat small" onClick={() => { const d = new Date(next.occurrence); d.setDate(d.getDate() - 1); d.setHours(18, 0, 0, 0); jump(d); }}><Moon size={15} />Evening before</button>
            <button className="btn blue small" onClick={() => jump(new Date(new Date(next.occurrence).getTime() + 2 * 60000))}><FastForward size={15} />Shift starts</button>
            <button className="btn blue small" onClick={() => jump(new Date(new Date(next.end).getTime() - 1 * 60000))}><FastForward size={15} />Shift ends</button>
          </>
        )}
        <button className="btn flat small" onClick={() => { const d = new Date(clock); d.setDate(20); d.setHours(10, 0, 0, 0); jump(d); }}><CalendarDays size={15} />The 20th</button>
        <button className="btn ghost small" onClick={() => jump(new Date())}>Real time</button>
        <button className="btn ghost small" onClick={() => { if (confirm('Restart this conversation?')) update((d) => { const p = getDB().sessions[phone]?.person; delete d.threads[phone]; delete d.sessions[phone]; d.ledger = d.ledger.filter((e) => e.person !== p); d.clockOffsetMs = 0; }); }}><RotateCcw size={15} />Restart</button>
      </div>
      <div className="stage">
        <div className="phone-wrap"><PhoneSim phone={phone} /></div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <section className="panel soft" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 30, alignItems: 'center' }}>
            <Gauge done={c?.done ?? 0} size={170} />
            <div>
              <h1 className="display" style={{ fontSize: '3rem', margin: 0 }}>{s?.name ?? 'The person'}</h1>
              <div className="subtitle">This month · {clock.toLocaleDateString('en-US', { month: 'long' })}</div>
              <div className="row" style={{ marginTop: 10 }}>
                {s?.decision?.outcome === 'subject' ? <span className="pill yellow">80-hour rule applies</span> : s?.decision ? <span className="pill lime"><span className="dot" />{s.decision.outcome.replace('_', ' ')}</span> : <span className="pill">Start on the phone</span>}
                {c && <span className={`pill ${c.gap ? 'blue' : 'lime'}`}>{c.gap ? `${c.gap} h to go` : 'Goal reached'}</span>}
              </div>
              {c && (
                <div className="stats" style={{ marginTop: 18, gap: 30 }}>
                  <Stat value={`${c.paid} h`} label="Paid work" icon={Briefcase} />
                  <Stat value={`${c.training} h`} label="Training" icon={GraduationCap} />
                  <Stat value={`${c.volunteer} h`} label="Volunteering" icon={HeartHandshake} />
                  <Stat value={`${c.booked} h`} label="Booked" icon={CalendarClock} />
                </div>
              )}
            </div>
          </section>
          {next && (
            <section className="panel tight row" style={{ flexWrap: 'nowrap' }}>
              <span className="ibtn yellow lg"><Clock size={22} /></span>
              <div style={{ flex: 1 }}>
                <b>{next.mission} · {next.siteName}</b>
                <div className="muted" style={{ fontSize: '0.86rem' }}>{new Date(next.occurrence).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' })} · {next.travel}</div>
              </div>
              <button className="btn dark" disabled={busy} onClick={scan}><ScanLine size={18} />Scan the QR at the door</button>
            </section>
          )}
          <CoordinatorPanel siteId={next?.siteId ?? s?.bookings[0]?.siteId} compact />
        </div>
      </div>
    </Layout>
  );
}
