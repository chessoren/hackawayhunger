import { useState } from 'react';
import { MessageCircle, Camera, ListChecks, ScanLine, Languages, Clock, KeyRound, RotateCcw } from 'lucide-react';
import { Layout, Stat, Unlock } from '../components/ui';
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
        <div className="grid" style={{ alignContent: 'start' }}>
          <section className="panel soft">
            <h1 className="display" style={{ fontSize: '3.4rem' }}>Text Count Me In</h1>
            <div className="subtitle">Plain SMS · any phone · 8 languages</div>
            <div className="row" style={{ marginTop: 12 }}>
              <span className="pill lime"><span className="dot" />No app</span>
              <span className="pill yellow">No password</span>
              <span className="pill blue">Always a human</span>
            </div>
            <div className="stats" style={{ marginTop: 26 }}>
              <Stat value="1" label="Question at a time" icon={MessageCircle} />
              <Stat value="3" label="Choices max" icon={ListChecks} />
              <Stat value="8" label="Languages" icon={Languages} />
            </div>
          </section>
          <section className="panel">
            <h3>Try it like Linda</h3>
            {[
              [MessageCircle, 'Say Hi', 'or Hola, Bonjour, Jambo — any of 8 languages.'],
              [ListChecks, 'Answer 6 questions', 'in your own words: “I hurt my back last year”.'],
              [Camera, 'Send the sample letter', 'summarized in 3 sentences with its deadline.'],
              [ScanLine, 'Pick 1, 2 or 3', 'then check in and validate on the Live demo.'],
            ].map(([I, t, d], i) => {
              const Icon = I as typeof Clock;
              return (
                <div key={i} className="row" style={{ marginTop: 12, flexWrap: 'nowrap' }}>
                  <span className={`ibtn sm ${['blue', 'yellow', 'lime', 'blue'][i]}`}><Icon size={17} /></span>
                  <div><b>{t as string}</b> <span className="muted">{d as string}</span></div>
                </div>
              );
            })}
            <p className="muted" style={{ marginTop: 16, fontSize: '0.86rem' }}>Keywords that always work, even without AI: HELP · DELETE · HOURS · MISSIONS · ATTESTATION · a site's 4-digit code.</p>
            <Unlock to="/stage" icon={KeyRound}>Open the live demo</Unlock>
          </section>
          <section className="panel tight">
            <div className="row">
              <label htmlFor="ph" style={{ margin: 0 }}>Simulated number</label>
              <input id="ph" style={{ maxWidth: 210 }} value={phone} onChange={(e) => { setPhone(e.target.value); try { localStorage.setItem('cmi.myphone', e.target.value); } catch { /* */ } }} />
              <button className="btn flat small" onClick={() => update((d) => { delete d.threads[phone]; delete d.sessions[phone]; })}><RotateCcw size={15} />Restart</button>
            </div>
            {session && <p className="muted" style={{ margin: '10px 0 0', fontSize: '0.86rem' }}>Stored: first name {session.name ? '✓' : '—'}, language ({session.lang}), answers, hours. Ledger ID <code>{session.person}</code></p>}
          </section>
        </div>
      </div>
    </Layout>
  );
}
