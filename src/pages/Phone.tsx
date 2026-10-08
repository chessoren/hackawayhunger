import { useState } from 'react';
import { Layout } from '../components/ui';
import PhoneSim from '../components/PhoneSim';
import { update, useDB } from '../app/store';

export const DEFAULT_PHONE = '+15155550158';

export function myPhone(): string {
  try { return localStorage.getItem('cmi.myphone') ?? DEFAULT_PHONE; } catch { return DEFAULT_PHONE; }
}

export default function Phone() {
  const db = useDB();
  const [phone, setPhone] = useState(myPhone());
  const session = db.sessions[phone];
  return (
    <Layout>
      <div className="stage">
        <div className="phone-wrap"><PhoneSim phone={phone} /></div>
        <div>
          <h1>Text Count Me In</h1>
          <p className="lead">This is exactly what someone sees on a basic phone: plain SMS, one question at a time, three choices max, always a way to a human. No app, no account, no password.</p>
          <div className="card">
            <h3>Try it like Linda</h3>
            <ol>
              <li>Say <strong>Hi</strong> (or <strong>Hola</strong> to switch to Spanish — any of 8 languages).</li>
              <li>Answer 6 quick questions — in your own words is fine (“I hurt my back last year”).</li>
              <li>Tap <strong>📄 Send the sample State letter</strong>: it is summarized in 3 sentences with its deadline.</li>
              <li>Pick a mission 1, 2 or 3 — then go to <a href="/stage">Live demo</a> to check in and validate as the coordinator.</li>
            </ol>
            <p className="muted">Keywords that always work, even without AI: HELP · DELETE · HOURS · MISSIONS · ATTESTATION · a site's 4-digit code.</p>
          </div>
          <div className="card tight" style={{ marginTop: 14 }}>
            <div className="row">
              <label htmlFor="ph" style={{ margin: 0 }}>Simulated phone number</label>
              <input id="ph" style={{ maxWidth: 200 }} value={phone} onChange={(e) => { setPhone(e.target.value); try { localStorage.setItem('cmi.myphone', e.target.value); } catch { /* */ } }} />
              <button className="btn secondary small" onClick={() => update((d) => { delete d.threads[phone]; delete d.sessions[phone]; })}>Restart conversation</button>
            </div>
            {session && <p className="muted" style={{ marginTop: 8 }}>Stored about this person: first name {session.name ? '✓' : '—'}, language ({session.lang}), answers, hours. Pseudonymous ID in the ledger: <code>{session.person}</code></p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}
