import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Logo } from '../components/ui';
import { send } from '../app/runtime';
import { useDB } from '../app/store';
import { myPhone } from './Phone';

/** Target of the QR code on the site poster: one tap to check in or out. */
export default function CheckIn() {
  const { code = '' } = useParams();
  const db = useDB();
  const site = db.sites.find((s) => s.code === code);
  const phone = myPhone();
  const [done, setDone] = useState<string | null>(null);
  const thread = db.threads[phone] ?? [];

  useEffect(() => {
    if (!site || done) return;
    const before = thread.length;
    send(phone, { text: code }).then(() => setDone(String(before)));
  }, [site?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const reply = done ? thread.slice(Number(done)).filter((m) => m.from === 'agent').map((m) => m.text).join('\n') : '';
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <Logo size={64} />
      <h1 className="display" style={{ fontSize: '2.6rem', marginTop: 20 }}>{site ? site.name : 'Unknown site'}</h1>
      {site && <div className="row" style={{ justifyContent: 'center', marginBottom: 18 }}><span className="pill lime"><span className="dot" />Host site</span><span className="pill yellow">Code {site.code}</span></div>}
      {!site && <p>This QR code is not registered.</p>}
      {site && !done && <p className="subtitle">Checking you in…</p>}
      {reply && <div className="panel verify-ok" style={{ whiteSpace: 'pre-wrap', fontSize: '1.15rem' }}>{reply}</div>}
      <p style={{ marginTop: 20 }}><Link className="btn" to="/phone">Open my messages</Link></p>
    </main>
  );
}
