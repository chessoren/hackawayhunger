import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import { Logo } from '../components/ui';
import { VerifyResult, verifyAttestation } from '../core/attestation';
import { trustedKeys } from '../app/signer';
import { attestationPdf, downloadBytes } from '../app/attestationPdf';
import { fingerprint } from '../core/crypto';

export default function Verify() {
  const [fragment, setFragment] = useState(window.location.hash.slice(1));
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [dev, setDev] = useState(false);
  const [signer, setSigner] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!fragment) return setResult(null);
    trustedKeys().then(({ keys, devKey }) => {
      const all = devKey ? [...keys, devKey] : keys;
      const r = verifyAttestation(fragment, all);
      setResult(r);
      if (r.status === 'authentic') {
        setSigner(r.signer);
        setDev(!!devKey && r.signer === devKey && !keys.includes(r.signer));
      }
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

  return (
    <main className="page" style={{ maxWidth: 860 }}>
      <Link to="/" className="brand" style={{ marginBottom: 16 }}><Logo /> Count Me In · Attestation check</Link>
      <h1>Verify an hours attestation</h1>
      <p className="lead">For caseworkers: scan the QR code on the document, or paste the link. Verification runs in your browser; nothing is stored. No account, no AI key needed.</p>

      {!fragment && (
        <div className="card">
          <div className="row">
            <button className="btn big" onClick={scan}>📷 Scan the QR code</button>
            <input placeholder="…or paste the verification link" onChange={(e) => { const f = e.target.value.split('#')[1]; if (f) { window.location.hash = f; setFragment(f); } }} />
          </div>
          <video ref={videoRef} style={{ width: '100%', marginTop: 12, display: scanning ? 'block' : 'none', borderRadius: 12 }} muted playsInline />
        </div>
      )}

      {result?.status === 'unreadable' && <div className="card verify-bad"><h2>Unreadable link</h2><p>This is not a Count Me In attestation link.</p></div>}

      {result && p && (
        <div className={`card ${result.status === 'authentic' ? 'verify-ok' : 'verify-bad'}`}>
          {result.status === 'authentic' ? (
            <h2 style={{ color: 'var(--green)' }}>✓ Authentic — not modified since it was signed</h2>
          ) : (
            <h2 style={{ color: 'var(--red)' }}>✗ Not valid — {result.status === 'tampered' ? result.reason : 'unknown signer'}</h2>
          )}
          {dev && <p className="pill orange">Signed with this device's development key (local demo) — a production attestation is signed by the platform server key.</p>}
          <div className="grid three" style={{ margin: '14px 0' }}>
            <div><div className="stat-label">Name</div><div className="stat" style={{ fontSize: '1.6rem' }}>{p.n}</div></div>
            <div><div className="stat-label">Month</div><div className="stat" style={{ fontSize: '1.6rem' }}>{p.m}</div></div>
            <div><div className="stat-label">Total hours</div><div className={`stat ${p.tot.all >= p.goal ? '' : 'orange'}`} style={{ fontSize: '1.6rem' }}>{p.tot.all} / {p.goal}</div></div>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Organization</th><th>Mission</th><th>In–Out</th><th>Hours</th><th>Validated by</th></tr></thead>
            <tbody>
              {p.it.map((i, k) => (
                <tr key={k}><td>{i.d}</td><td>{i.s}</td><td>{i.mi}</td><td>{i.in}–{i.out}</td><td>{i.h}</td><td>{i.c}{i.vk && <><br /><small>key {i.vk}</small></>}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 10 }}>
            Volunteering {p.tot.volunteer} h · Training {p.tot.training} h · Paid work declared by the person {p.tot.paid_declared} h. ID {p.id} · issued {new Date(p.iss).toLocaleString()} · rules {p.rv} · platform key {p.pk}
          </p>
          {result.status === 'authentic' && (
            <button className="btn secondary" onClick={async () => downloadBytes(await attestationPdf(p, window.location.href, signer, dev), `${p.id}.pdf`)}>Download the PDF</button>
          )}
        </div>
      )}
      {fragment && <p style={{ marginTop: 14 }}><button className="btn ghost small" onClick={() => { window.location.hash = ''; setFragment(''); }}>Verify another document</button></p>}
      <p className="muted" style={{ marginTop: 20, fontSize: '0.85rem' }}>How it works: the attestation is signed with the Count Me In platform Ed25519 key{signer ? ` (${fingerprint(signer)})` : ''}. Each line also references the coordinator-signed ledger entry. Changing any character — a date, an hour, a name — invalidates the signature.</p>
    </main>
  );
}
