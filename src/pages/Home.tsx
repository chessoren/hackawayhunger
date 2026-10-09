import { Link } from 'react-router-dom';
import { Clock, Languages, ShieldCheck, Smartphone, Handshake, Landmark, Map, Lock, Star, BatteryCharging, CalendarCheck, ScanLine, BadgeCheck, FileCheck2 } from 'lucide-react';
import { Gauge, Layout, Stat, Unlock } from '../components/ui';
import { useDB } from '../app/store';
import { shifts } from '../core/ledger';
import { countyOpportunities } from '../core/deserts';
import MiniIowa from '../components/MiniIowa';

export default function Home() {
  const db = useDB();
  const validated = shifts(db.ledger).filter((s) => s.status === 'validated');
  const hours = validated.reduce((a, s) => a + s.hours, 0);
  const deserts = countyOpportunities(db.sites).filter((c) => c.level === 'desert').length;

  return (
    <Layout>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,0.85fr)', gap: 22 }}>
        <section className="panel soft" style={{ padding: '44px 44px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <h1 className="display hero-title" style={{ margin: 0 }}>Count Me In</h1>
          <div className="subtitle" style={{ marginTop: 8 }}>Volunteer hours, verified — SNAP kept</div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <span className="pill lime"><span className="dot" />Live in Iowa</span>
            <span className="pill yellow">80-hour rule</span>
          </div>
          <div className="stats" style={{ justifyContent: 'center', marginTop: 30 }}>
            <Stat value="80 h" label="Monthly rule" icon={Clock} />
            <Stat value="8" label="Languages" icon={Languages} />
            <Stat value="1 sec" label="To verify" icon={ShieldCheck} />
          </div>
          <div style={{ margin: '34px 0 26px' }}><Gauge done={47} size={230} /></div>
          <p style={{ maxWidth: 520, color: 'var(--ink-2)' }}>
            Since 2025, adults 18–64 must prove <b>80 hours a month</b> of work, training or volunteering to keep SNAP. The law already counts volunteering — <b>what's missing is the proof</b>. Count Me In builds it.
          </p>
          <div className="row" style={{ justifyContent: 'center', marginTop: 8 }}>
            <span className="pill lime big">{hours} h</span>
            <span className="ibtn sm" style={{ background: '#fff' }}><BatteryCharging size={18} /></span>
            <span style={{ marginLeft: 10, textAlign: 'left' }}><b><Star size={15} fill="#8ecdf6" color="#8ecdf6" style={{ verticalAlign: -2 }} /> {validated.length}</b><br /><small>shifts verified</small></span>
          </div>
          <div style={{ width: '100%', maxWidth: 460, marginTop: 26 }}>
            <Unlock to="/stage" icon={Lock}>Try the live demo</Unlock>
          </div>
        </section>

        <section className="map-panel" style={{ minHeight: 640 }}>
          <MiniIowa />
          <div className="map-overlay tl">
            <div className="search" style={{ maxWidth: 'none' }}><span className="ibtn sm blue"><Map size={17} /></span>Opportunity deserts · Iowa</div>
          </div>
          <div className="map-overlay" style={{ top: 96, left: 0, right: 0, textAlign: 'center' }}>
            <div className="big-number">{deserts}</div>
            <span className="pill yellow" style={{ marginTop: 6 }}>Counties out of reach</span>
          </div>
          <div className="map-overlay bl" style={{ right: 18 }}>
            <Link to="/dashboard" className="unlock" style={{ minHeight: 58 }}>
              <span className="knob" style={{ background: 'var(--blue)', width: 44, height: 44 }}><Map size={20} /></span>
              <span className="txt" style={{ textAlign: 'left' }}>Open the impact map</span>
            </Link>
          </div>
        </section>
      </div>

      <div className="section-title"><h2>One hour, three winners</h2></div>
      <div className="grid three">
        <Link to="/phone" className="panel" style={{ textDecoration: 'none' }}>
          <span className="ibtn blue lg"><Smartphone size={22} /></span>
          <h3 style={{ marginTop: 16 }}>The person</h3>
          <p className="muted">Keeps SNAP. No app, no password — SMS or a call, in their language.</p>
          <span className="pill lime">Keeps food aid</span>
        </Link>
        <Link to="/coordinator" className="panel" style={{ textDecoration: 'none' }}>
          <span className="ibtn yellow lg"><Handshake size={22} /></span>
          <h3 style={{ marginTop: 16 }}>The pantry</h3>
          <p className="muted">Gets regular volunteers. A QR code and one tap replace the paper sign-in sheet.</p>
          <span className="pill yellow">Gains volunteers</span>
        </Link>
        <Link to="/verify" className="panel" style={{ textDecoration: 'none' }}>
          <span className="ibtn lime lg"><Landmark size={22} /></span>
          <h3 style={{ marginTop: 16 }}>The State</h3>
          <p className="muted">Receives signed proof it can verify in one second, instead of files to re-key.</p>
          <span className="pill blue">Clean proof</span>
        </Link>
      </div>

      <div className="section-title"><h2>The life of one hour</h2><span className="count">5 steps</span></div>
      <div className="grid two">
        {[
          { icon: CalendarCheck, t: 'Book', d: 'Three missions max, ranked by real access: walk, DART bus, schedule, language.' },
          { icon: ScanLine, t: 'Arrive & leave', d: 'Scan the QR at the door, or text the 4-digit code from any basic phone.' },
          { icon: BadgeCheck, t: 'Validate', d: 'The coordinator confirms in one tap. The entry is hash-chained and signed (Ed25519).' },
          { icon: Clock, t: 'Count', d: 'The 80-hour gauge moves. Falling behind? A nudge, then a human navigator.' },
          { icon: FileCheck2, t: 'Prove', d: 'A monthly attestation with a QR code. Sent to the State only after an explicit YES.' },
        ].map((s, i) => (
          <div key={s.t} className="journey" style={{ margin: 0 }}>
            <div className="date">0{i + 1}</div>
            <div>
              <div className="row" style={{ gap: 8 }}><s.icon size={18} color="#f4a62a" /><b>{s.t}</b></div>
              <div style={{ color: '#c9c9cd', fontSize: '0.9rem', marginTop: 4 }}>{s.d}</div>
            </div>
          </div>
        ))}
        <Link to="/onboard" className="panel" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="ibtn yellow lg"><Handshake size={22} /></span>
          <div><h3 style={{ margin: 0 }}>Become a host site</h3><span className="muted">About 10 minutes · free</span></div>
          <span className="spacer" /><b>&gt;&gt;</b>
        </Link>
      </div>
    </Layout>
  );
}
