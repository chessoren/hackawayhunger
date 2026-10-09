import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { Logo } from '../components/ui';
import { VerifyResult, verifyAttestation } from '../core/attestation';
import { trustedKeys } from '../app/signer';
import { attestationPdf, downloadBytes } from '../app/attestationPdf';
import { fingerprint } from '../core/crypto';
import { ScanLine, ShieldCheck, ShieldX, Download, Clock, CalendarDays, User, RotateCcw } from 'lucide-react';
import { Stat } from '../components/ui';

export default function Verify() {
  const [fragment, setFragment] = useState(window.location.hash.slice(1));
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [dev, setDev] = useState(false);
  const [signer, setSigner] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // A pasted or scanned link only changes the #fragment: re-verify on every change.
  useEffect(() => {
    const onHash = () => setFragment(window.location.hash.slice(1));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!fragment) return setResult(null);
    trustedKeys().then(({ keys, devKey }) => {
      const all = devKey ? [...keys, devKey] : keys;
      const r = verifyAttestation(fragment, all);
      setResult(r);
      if (r.status === 'authentic') {
        setSigner(r.signer);
        setDev(!!devKey && r.signer === devKey && !keys.includes(r.signer));
      } else setDev(false);
    });
  }, [fragment]);

  async function scan() {
    setScanning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const v = videoRef.current!;
    v.srcObject = stream;
    await v.play();
    const c = document.createElement('canvas');
    const loop = () => {
      if (!v.videoWidth) return requestAnimationFrame(loop);
      c.width = v.videoWidth; c.height = v.videoHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(v, 0, 0);
      const code = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
      if (code?.data.includes('/verify#')) {
        stream.getTracks().forEach((t) => t.stop());
        setScanning(false);
        const f = code.data.split('#')[1];
        window.location.hash = f;
        setFragment(f);
      } else requestAnimationFrame(loop);
    };
    loop();
  }

  const p = result && result.status !== 'unreadable' ? result.payload : null;
  const ok = result?.status === 'authentic';

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '30px 20px 60px' }}>
      <Link to="/" className="row" style={{ textDecoration: 'none', fontWeight: 800 }}><Logo size={40} /> Count Me In <span className="pill blue" style={{ marginLeft: 6 }}>Attestation check</span></Link>
      <h1 className="display hero-title" style={{ marginTop: 26 }}>Verify an attestation</h1>
      <div className="subtitle">For caseworkers · one second · nothing stored</div>
      <div className="row" style={{ margin: '10px 0 22px' }}><span className="pill lime"><span className="dot" />No account</span><span className="pill yellow">No AI key</span></div>

      {!fragment && (
        <div className="panel">
          <button className="unlock" onClick={scan}><span className="knob"><ScanLine size={22} /></span><span className="txt">Scan the QR code</span><span className="chev">&gt;&gt;</span></button>
          <div className="field" style={{ marginTop: 14 }}><input placeholder="…or paste the verification link" onChange={(e) => { const f = e.target.value.split('#')[1]; if (f) { window.location.hash = f; setFragment(f); } }} /></div>
          <video ref={videoRef} style={{ width: '100%', marginTop: 12, display: scanning ? 'block' : 'none', borderRadius: 22 }} muted playsInline />
        </div>
      )}

      {result?.status === 'unreadable' && <div className="panel verify-bad"><h2>Unreadable link</h2><p>This is not a Count Me In attestation link.</p></div>}

      {result && p && (
        <div className={`panel ${ok ? 'verify-ok' : 'verify-bad'}`} style={{ padding: 32 }}>
          <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <span className={`ibtn lg ${ok ? 'lime' : ''}`} style={ok ? undefined : { background: '#ffc9bb' }}>{ok ? <ShieldCheck size={24} /> : <ShieldX size={24} />}</span>
            <div>
              <h2 style={{ margin: 0 }}>{ok ? 'Authentic' : 'Not valid'}</h2>
              <div className="muted">{ok ? 'Not modified since it was signed by Count Me In.' : result.status === 'tampered' ? result.reason : 'Unknown signer.'}</div>
            </div>
          </div>
          {dev && <p style={{ marginTop: 12 }}><span className="pill yellow">Signed with this device's development key (local demo) — production attestations use the platform server key.</span></p>}
          <div className="stats" style={{ margin: '24px 0', gap: 44 }}>
            <Stat value={p.n} label="Name" icon={User} />
            <Stat value={p.m} label="Month" icon={CalendarDays} />
            <Stat value={<>{p.tot.all} <span className="muted" style={{ fontSize: '1rem' }}>/ {p.goal} h</span></>} label="Total hours" icon={Clock} />
          </div>
          <div className="panel" style={{ padding: '8px 18px', boxShadow: 'none' }}>
            <table>
              <thead><tr><th>Date</th><th>Organization</th><th>Mission</th><th>In–Out</th><th>Hours</th><th>Validated by</th></tr></thead>
              <tbody>
                {p.it.map((i, k) => (
                  <tr key={k}><td>{i.d}</td><td><b>{i.s}</b></td><td>{i.mi}</td><td>{i.in === "—" ? "—" : `${i.in}–${i.out}`}</td><td><span className={`pill ${i.cat === 'volunteer' ? 'lime' : ''}`}>{i.h} h</span></td><td>{i.c}{i.vk && <><br /><small>key {i.vk}</small></>}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: 14, fontSize: '0.84rem' }}>
            Volunteering {p.tot.volunteer} h · Training {p.tot.training} h · Paid work declared by the person {p.tot.paid_declared} h · ID {p.id} · issued {new Date(p.iss).toLocaleString()} · rules {p.rv} · platform key {p.pk}
          </p>
          {ok && <button className="btn dark" onClick={async () => downloadBytes(await attestationPdf(p, window.location.href, signer, dev), `${p.id}.pdf`)}><Download size={17} />Download the PDF</button>}
        </div>
      )}
      {fragment && <p style={{ marginTop: 14 }}><button className="btn flat small" onClick={() => { window.location.hash = ''; setFragment(''); }}><RotateCcw size={15} />Verify another document</button></p>}
      <p className="muted" style={{ marginTop: 20, fontSize: '0.84rem' }}>The attestation is signed with the Count Me In platform Ed25519 key{signer ? ` (${fingerprint(signer)})` : ''}. Each line references a coordinator-signed ledger entry. Changing any character — a date, an hour, a name — invalidates the signature.</p>
    </main>
  );
}
