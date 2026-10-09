import { useEffect, useRef, useState } from 'react';
import { useDB } from '../app/store';
import { send } from '../app/runtime';
import { ChatMsg } from '../app/store';
import { Gauge, Logo } from './ui';
import { Phone as PhoneIcon, Camera, Mic, ArrowUp, FileText, MapPin, ShieldCheck, Bell, BatteryCharging } from 'lucide-react';
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
  if (c.kind === 'gauge') {
    const pct = Math.round((Math.min(c.done, c.goal) / c.goal) * 100);
    return (
      <div className="mini-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Gauge done={c.done} goal={c.goal} size={86} />
        <div>
          <div className="row" style={{ gap: 6 }}><span className={`pill ${pct >= 100 ? 'lime' : 'yellow'}`} style={{ fontSize: '1rem', fontWeight: 800 }}>{pct}%</span><span className="ibtn sm" style={{ background: 'var(--surface-2)', width: 32, height: 32, minWidth: 32 }}><BatteryCharging size={16} /></span></div>
          <div style={{ marginTop: 6 }}><b>{Math.max(0, c.goal - c.done)} h to go</b>{c.daysLeft ? <div className="muted">{c.daysLeft} days left</div> : null}</div>
        </div>
      </div>
    );
  }
  if (c.kind === 'booking') return (
    <div className="mini-card">
      <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}><span className="ibtn sm yellow"><MapPin size={16} /></span><div><b>{c.booking.siteName}</b><div className="muted" style={{ fontSize: '0.8rem' }}>{c.booking.address}</div></div></div>
      <div className="row" style={{ gap: 6, marginTop: 8 }}><span className="pill lime"><span className="dot" />Booked</span><span className="pill yellow">Code {c.booking.code}</span><a className="pill white" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(c.booking.address)}`} target="_blank" rel="noreferrer">Directions</a></div>
    </div>
  );
  if (c.kind === 'attestation') return <a className="mini-card row" style={{ gap: 8, textDecoration: 'none', flexWrap: 'nowrap' }} href={c.url} target="_blank" rel="noreferrer"><span className="ibtn sm lime"><FileText size={16} /></span><b>Open my signed attestation</b><span style={{ marginLeft: 6 }}>&gt;&gt;</span></a>;
  if (c.kind === 'decision' && c.decision.cite) return <div className="mini-card"><span className="pill blue"><ShieldCheck size={13} />Rule cited</span><div style={{ marginTop: 6 }}><a href={c.decision.cite.url} target="_blank" rel="noreferrer">{c.decision.cite.title}</a></div><small>Rules file {c.decision.rulesVersion}</small></div>;
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
  const unread = Math.min(9, thread.filter((m) => m.from === 'agent' && m.card).length);

  return (
    <div className="phone" style={height ? { height } : undefined} aria-label="Simulated phone">
      <div className="phone-screen">
        <div className="phone-head">
          <Logo size={44} />
          <div>
            <div className="title">Count Me In</div>
            <div className="sub">(515) 800-8080 · {langByCode(lang).native}</div>
          </div>
          <span className="spacer" />
          <button className={`ibtn raised ${voice ? 'blue' : ''}`} title={voice ? 'Voice call mode on' : 'Voice call mode: read replies aloud'} aria-label="Voice call mode" aria-pressed={voice} onClick={() => { setVoice(!voice); if (voice) speechSynthesis?.cancel(); }}><PhoneIcon size={19} /></button>
          <span className="ibtn raised" aria-hidden="true"><Bell size={19} />{unread > 0 && <span className="badge">{unread}</span>}</span>
        </div>
        <div className="thread" aria-live="polite" ref={threadRef}>
          {!thread.length && (
            <div className="bubble system">Send “Hi”, “Hola”, “Bonjour” or “Jambo” to start — or turn on voice mode.</div>
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
          <button type="button" className="ibtn sm raised" title="Send a photo of a letter" aria-label="Send a photo" onClick={() => fileRef.current?.click()}><Camera size={18} /></button>
          <input aria-label="Message" placeholder="Text message" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className={`ibtn sm raised ${listening ? 'live' : ''}`} title="Speak" aria-label="Speak" onClick={listen}><Mic size={18} /></button>
          <button className="ibtn sm blue send" title="Send" aria-label="Send" disabled={busy}><ArrowUp size={19} /></button>
        </form>
        <div style={{ padding: '0 12px 14px' }}>
          <button className="unlock" style={{ minHeight: 54, fontSize: '0.92rem', padding: '5px 16px 5px 5px' }} onClick={sampleLetter} disabled={busy}>
            <span className="knob" style={{ width: 44, height: 44, borderRadius: 13 }}><FileText size={19} /></span>
            <span className="txt">Send the sample State letter</span><span className="chev">&gt;&gt;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
