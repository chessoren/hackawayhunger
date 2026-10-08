import { useEffect, useRef, useState } from 'react';
import { useDB } from '../app/store';
import { send } from '../app/runtime';
import { ChatMsg } from '../app/store';
import { Gauge, Logo } from './ui';
import { langByCode } from '../core/i18n';

/** Resize a photo on-device before sending (privacy + bandwidth). */
async function toJpeg(file: Blob, max = 1600): Promise<{ base64: string; dataUrl: string }> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/jpeg', 0.85);
  return { base64: dataUrl.split(',')[1], dataUrl };
}

type SR = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null; onerror: ((e: unknown) => void) | null };
const SpeechRec: (new () => SR) | undefined = (window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: new () => SR }).webkitSpeechRecognition;

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text.replace(/https?:\S+/g, 'link'));
  u.lang = langByCode(lang).speech;
  u.rate = 0.98;
  speechSynthesis.speak(u);
}

function Card({ m }: { m: ChatMsg }) {
  const c = m.card;
  if (!c) return null;
  if (c.kind === 'gauge') return <div className="mini-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}><Gauge done={c.done} goal={c.goal} size={92} /><div><strong>{Math.max(0, c.goal - c.done)} h to go</strong>{c.daysLeft ? <div className="muted">{c.daysLeft} days left</div> : null}</div></div>;
  if (c.kind === 'booking') return <div className="mini-card">📍 <strong>{c.booking.siteName}</strong><br />{c.booking.address}<br /><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.booking.address)}&travelmode=transit`} target="_blank" rel="noreferrer">Directions</a> · code <strong>{c.booking.code}</strong></div>;
  if (c.kind === 'attestation') return <div className="mini-card">📄 <a href={c.url} target="_blank" rel="noreferrer"><strong>Open my signed attestation</strong></a></div>;
  if (c.kind === 'decision' && c.decision.cite) return <div className="mini-card"><span className="pill gray">Rule cited</span><br /><a href={c.decision.cite.url} target="_blank" rel="noreferrer">{c.decision.cite.title}</a><br /><small>Rules file {c.decision.rulesVersion}</small></div>;
  return null;
}

export default function PhoneSim({ phone, height }: { phone: string; height?: number }) {
  const db = useDB();
  const thread = db.threads[phone] ?? [];
  const session = db.sessions[phone];
  const lang = session?.lang ?? 'en';
  const rtl = langByCode(lang).rtl;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voice, setVoice] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const spokenRef = useRef<number>(thread.length);

  // Scroll only the conversation, never the page.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [thread.length, busy]);

  // Voice mode: read new agent messages aloud.
  useEffect(() => {
    if (voice) thread.slice(spokenRef.current).filter((m) => m.from === 'agent').forEach((m) => speak(m.text, lang));
    spokenRef.current = thread.length;
  }, [thread.length, voice, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(t: string, image?: { base64: string; mediaType: string; preview: string }) {
    if (!t.trim() && !image) return;
    setText('');
    setBusy(true);
    await send(phone, { text: t.trim(), image: image && { base64: image.base64, mediaType: image.mediaType }, imagePreview: image?.preview });
    setBusy(false);
  }

  async function onFile(f: Blob | undefined) {
    if (!f) return;
    const { base64, dataUrl } = await toJpeg(f);
    await submit('', { base64, mediaType: 'image/jpeg', preview: dataUrl });
  }

  async function sampleLetter() {
    const r = await fetch('/demo-letter.jpg');
    await onFile(await r.blob());
  }

  function listen() {
    if (!SpeechRec) return alert('Voice input is not supported in this browser. Try Chrome.');
    const rec = new SpeechRec();
    rec.lang = langByCode(lang).speech;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => submit(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  const last = thread[thread.length - 1];

  return (
    <div className="phone" style={height ? { height } : undefined} aria-label="Simulated phone">
      <div className="phone-screen">
        <div className="phone-head">
          <div className="avatar"><Logo size={30} /></div>
          <div>
            <div className="title">Count Me In</div>
            <div className="sub">(515) 800-8080 · SMS · {langByCode(lang).native}</div>
          </div>
          <span className="spacer" />
          <button className={`icon-btn ${voice ? 'send' : ''}`} title={voice ? 'Voice call mode on' : 'Voice call mode: read replies aloud'} aria-pressed={voice} onClick={() => { setVoice(!voice); if (voice) speechSynthesis?.cancel(); }}>📞</button>
        </div>
        <div className="thread" aria-live="polite" ref={threadRef}>
          {!thread.length && (
            <div className="bubble system">Send “Hi”, “Bonjour”, “Hola” or “Jambo” to start — or tap the 📞 for a voice call.</div>
          )}
          {thread.map((m) => (
            <div key={m.id} style={{ display: 'contents' }}>
              {(m.text || m.image) && (
                <div className={`bubble ${m.from}`} dir={m.from === 'agent' && rtl ? 'rtl' : undefined}>
                  {m.image && <img src={m.image} alt="Photo sent" />}
                  {m.text}
                </div>
              )}
              <Card m={m} />
            </div>
          ))}
          {busy && <div className="typing" aria-label="Count Me In is typing"><span /><span /><span /></div>}
          {!busy && last?.from === 'agent' && last.quick && (
            <div className="quick">{last.quick.map((q) => <button key={q} onClick={() => submit(q.split(' ')[0].match(/^\d$/) ? q.split(' ')[0] : q)}>{q}</button>)}</div>
          )}
        </div>
        <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" className="icon-btn" title="Send a photo of a letter" onClick={() => fileRef.current?.click()}>📷</button>
          <input aria-label="Message" placeholder="Text message" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className={`icon-btn ${listening ? 'live' : ''}`} title="Speak" onClick={listen}>🎙️</button>
          <button className="icon-btn send" title="Send" disabled={busy}>➤</button>
        </form>
        <div style={{ padding: '0 10px 10px', background: '#f8f9f8' }}>
          <button className="btn ghost small" style={{ width: '100%' }} onClick={sampleLetter} disabled={busy}>📄 Send the sample State letter (demo)</button>
        </div>
      </div>
    </div>
  );
}
