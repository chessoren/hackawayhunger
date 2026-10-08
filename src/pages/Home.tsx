import { Link } from 'react-router-dom';
import { Gauge, Layout } from '../components/ui';
import { useDB } from '../app/store';
import { shifts } from '../core/ledger';

export default function Home() {
  const db = useDB();
  const all = shifts(db.ledger);
  const validated = all.filter((s) => s.status === 'validated');
  const hours = validated.reduce((a, s) => a + s.hours, 0);

  return (
    <Layout>
      <section className="hero">
        <div>
          <span className="pill orange">SNAP 80-hour work rule · Iowa</span>
          <h1 style={{ marginTop: 12 }}>The people in the food line can be the ones who move it — and keep their food aid doing it.</h1>
          <p className="lead">
            Since the 2025 federal law, adults 18–64 without a child under 14 must prove 80 hours a month of work, training or volunteering to keep SNAP.
            The law already counts volunteering. <strong>What's missing is the proof.</strong> Count Me In builds it: an SMS and voice assistant in 8 languages,
            QR check-ins at food pantries, one-tap coordinator validation, and a signed attestation the State can verify in one second.
          </p>
          <div className="row">
            <Link className="btn big" to="/stage">▶ Try the live demo</Link>
            <Link className="btn big secondary" to="/phone">Text the assistant</Link>
          </div>
          <p className="quote">“We don't create food. We stop it from disappearing.”</p>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <Gauge done={Math.min(80, 58)} size={200} />
          <p style={{ marginTop: 12 }}><strong>Linda, 58, Des Moines</strong> — cleans houses 10 h/week, no car. <br />A letter gives her 21 days. Count Me In finds her a pantry shift 800 m away on her bus line.</p>
          <div className="grid" style={{ marginTop: 10, gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div><div className="stat">{validated.length}</div><div className="stat-label">shifts validated</div></div>
            <div><div className="stat">{hours}</div><div className="stat-label">hours verified</div></div>
            <div><div className="stat">{db.sites.length}</div><div className="stat-label">host sites</div></div>
          </div>
          <small>Live from this device's signed ledger</small>
        </div>
      </section>

      <h2 style={{ marginTop: 30 }}>One mechanism, three winners</h2>
      <div className="grid four">
        <Link to="/phone" className="card tile"><div className="icon">📱</div><h3>The person</h3><p className="muted">Keeps SNAP. No app, no password — SMS or a phone call, in their language.</p></Link>
        <Link to="/coordinator" className="card tile"><div className="icon">🤝</div><h3>The pantry</h3><p className="muted">Gets regular volunteers. Replaces the paper sign-in sheet with a QR code and a one-tap validation.</p></Link>
        <Link to="/verify" className="card tile"><div className="icon">🏛️</div><h3>The State</h3><p className="muted">Receives clean, signed, verifiable proof — instead of incomplete files to process by hand.</p></Link>
        <Link to="/dashboard" className="card tile"><div className="icon">🗺️</div><h3>The community</h3><p className="muted">Sees, county by county, the aid preserved — and the opportunity deserts where 80 hours are impossible.</p></Link>
      </div>

      <h2 style={{ marginTop: 34 }}>The life of one hour</h2>
      <div className="card">
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li><strong>Book</strong> — the agent offers 3 missions max, ranked by real access (walk, DART bus, schedule, language).</li>
          <li><strong>Arrive & leave</strong> — scan the QR at the door, or text the 4-digit code from any basic phone.</li>
          <li><strong>Validate</strong> — the coordinator confirms in one tap; the entry is hash-chained and signed (Ed25519).</li>
          <li><strong>Count</strong> — the 80-hour gauge updates; at risk mid-month, the agent nudges or calls in a human navigator.</li>
          <li><strong>Prove</strong> — a monthly PDF attestation with a QR any caseworker verifies in one second. Sent to the State only after an explicit YES.</li>
        </ol>
      </div>

      <div className="grid three" style={{ marginTop: 20 }}>
        <Link to="/onboard" className="card tile"><h3>Become a host site in 10 minutes →</h3><p className="muted">Pantries, churches, gardens, corporate volunteer programs.</p></Link>
        <Link to="/rules" className="card tile"><h3>Read the Iowa rules file →</h3><p className="muted">One YAML per state, readable by a paralegal. The law changes; the code doesn't.</p></Link>
        <Link to="/navigator" className="card tile"><h3>Navigator console →</h3><p className="muted">Every conversation can reach a human. Escalations and at-risk people land here.</p></Link>
      </div>
    </Layout>
  );
}
