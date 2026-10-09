import { useState } from 'react';
import { Layout } from '../components/ui';
import { RULES, RULES_TEXT } from '../app/runtime';
import { Facts, decide } from '../core/rules';

export default function Rules() {
  const [f, setF] = useState<Facts>({ age: 58, child_under_14: false, pregnant: false, health_limits_work: false, cares_for_incapacitated: false, weekly_paid_hours: 10 });
  const d = decide(RULES, f);
  const yn = (k: keyof Facts) => (
    <select value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value === 'unsure' ? 'unsure' : undefined })}>
      <option value="undefined">unknown</option><option value="true">yes</option><option value="false">no</option>{k === 'health_limits_work' && <option value="unsure">not sure</option>}
    </select>
  );
  return (
    <Layout>
      <h1 className="display" style={{ fontSize: '3.2rem', margin: 0 }}>Iowa rules file</h1>
      <div className="subtitle">One YAML per state · readable by a paralegal · cited</div>
      <div className="row" style={{ margin: '10px 0 22px' }}><span className="pill lime"><span className="dot" />Deterministic</span><span className="pill yellow">AI never decides</span><span className="pill blue">50-state ready</span></div>
      <div className="grid two">
        <div className="panel">
          <h3>Try the deterministic engine</h3>
          <p className="muted">The AI only turns words into these facts. This engine decides, and cites the rule.</p>
          <table>
            <tbody>
              <tr><td className="muted">Age</td><td><input type="number" value={f.age ?? ''} onChange={(e) => setF({ ...f, age: e.target.value ? Number(e.target.value) : undefined })} /></td></tr>
              <tr><td>Child under 14 in SNAP household</td><td>{yn('child_under_14')}</td></tr>
              <tr><td>Pregnant</td><td>{yn('pregnant')}</td></tr>
              <tr><td>Health condition limiting work</td><td>{yn('health_limits_work')}</td></tr>
              <tr><td>Cares for an incapacitated person</td><td>{yn('cares_for_incapacitated')}</td></tr>
              <tr><td>Paid hours / week</td><td><input type="number" value={f.weekly_paid_hours ?? ''} onChange={(e) => setF({ ...f, weekly_paid_hours: e.target.value ? Number(e.target.value) : undefined })} /></td></tr>
              <tr><td>Veteran (no longer exempt)</td><td>{yn('veteran')}</td></tr>
            </tbody>
          </table>
          <div className="tile" style={{ marginTop: 14 }}>
            <span className={`pill ${d.outcome === 'subject' ? 'yellow' : d.outcome === 'needs_review' ? 'coral' : 'lime'}`}>{d.outcome.replace('_', ' ')}</span>
            <p style={{ marginTop: 8 }}>{d.missing.length ? `Needs: ${d.missing.join(', ')}` : d.plain}</p>
            {d.proof && <p className="muted">Proof: {d.proof}</p>}
            {d.cite && <a href={d.cite.url} target="_blank" rel="noreferrer">{d.cite.title}</a>}
            {d.removedNotices.map((n) => <p key={n.id} className="muted">⚠ {n.plain}</p>)}
            <p className="muted" style={{ marginTop: 6 }}>Rules version {d.rulesVersion}</p>
          </div>
        </div>
        <div>
          <pre className="yaml" aria-label="rules/iowa.yaml">{RULES_TEXT}</pre>
        </div>
      </div>
    </Layout>
  );
}
