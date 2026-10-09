import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, ShieldCheck, Lock, Sparkles, Scale, Gift, RotateCcw } from 'lucide-react';
import { Logo, Stat } from '../components/ui';
import { DEFAULT_MODELS, MODEL_CHOICES, Provider, guessProvider, testKey } from '../core/llm';
import { clearLlmConfig, getLlmConfig, resetDemo, saveLlmConfig } from '../app/store';

export default function Setup() {
  const existing = getLlmConfig();
  const [provider, setProvider] = useState<Provider>(existing?.provider ?? 'anthropic');
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [model, setModel] = useState(existing?.model ?? DEFAULT_MODELS[existing?.provider ?? 'anthropic']);
  const [remember, setRemember] = useState(existing?.remember ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params] = useSearchParams();
  const nav = useNavigate();

  const onKey = (k: string) => {
    setApiKey(k.trim());
    const g = guessProvider(k.trim());
    if (g && g !== provider) { setProvider(g); setModel(DEFAULT_MODELS[g]); }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await testKey({ provider, apiKey, model, browser: true });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    saveLlmConfig({ provider, apiKey, model, remember });
    nav(params.get('next') || '/');
  }

  return (
    <main style={{ maxWidth: 1180, margin: '0 auto', padding: '34px 20px 60px' }}>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 22, alignItems: 'stretch' }}>
        <section className="panel soft center" style={{ padding: 44, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Logo size={64} />
          <h1 className="display hero-title" style={{ marginTop: 24 }}>Count Me In</h1>
          <div className="subtitle">Every hour counts. So do you.</div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <span className="pill lime"><span className="dot" />Bring your own key</span>
            <span className="pill yellow">Temporary for judging</span>
          </div>
          <div className="stats" style={{ justifyContent: 'center', marginTop: 34 }}>
            <Stat value="Browser" label="Key stays here" icon={Lock} />
            <Stat value="Rules" label="Decide, not AI" icon={Scale} />
            <Stat value="Funded" label="If we win" icon={Gift} />
          </div>
          <p style={{ marginTop: 34, maxWidth: 440, color: 'var(--ink-2)' }}>
            Count Me In uses AI to understand people in their own words and language, and to read photos of letters. For the hackathon judging, the app runs on <b>your own Claude or OpenAI key</b>. It is sent only to the provider you choose — never to our servers, never in the code.
          </p>
          <span className="spacer" />
          <Link to="/verify" className="unlock" style={{ marginTop: 18 }}>
            <span className="knob" style={{ background: 'var(--lime)' }}><ShieldCheck size={22} /></span>
            <span className="txt">Verify an attestation — no key</span><span className="chev">&gt;&gt;</span>
          </Link>
        </section>

        <section className="panel" style={{ padding: 40 }}>
          <div className="row"><span className="ibtn blue lg"><KeyRound size={22} /></span><div><h2 style={{ margin: 0 }}>Connect an AI key</h2><span className="muted">One step, then the whole service opens.</span></div></div>
          <form onSubmit={submit} style={{ marginTop: 28 }}>
            <div className="field">
              <label>Provider</label>
              <div className="row">
                {(['anthropic', 'openai'] as Provider[]).map((p) => (
                  <button type="button" key={p} className={`btn ${provider === p ? 'blue' : 'flat'}`} onClick={() => { setProvider(p); setModel(DEFAULT_MODELS[p]); }} aria-pressed={provider === p}>
                    <Sparkles size={17} />{p === 'anthropic' ? 'Claude' : 'OpenAI'}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="key">API key</label>
              <input id="key" type="password" autoComplete="off" spellCheck={false} placeholder={provider === 'anthropic' ? 'sk-ant-…' : 'sk-…'} value={apiKey} onChange={(e) => onKey(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="model">Model</label>
              <select id="model" value={model} onChange={(e) => setModel(e.target.value)}>
                {MODEL_CHOICES[provider].map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember on this device (otherwise forgotten when the tab closes)</label>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="unlock" disabled={busy || !apiKey} style={{ marginTop: 8 }}>
              <span className="knob"><Lock size={22} /></span>
              <span className="txt">{busy ? 'Checking key…' : 'Check key and start'}</span><span className="chev">&gt;&gt;</span>
            </button>
          </form>
          {existing && (
            <div className="row" style={{ marginTop: 18 }}>
              <button type="button" className="btn flat small" onClick={() => { clearLlmConfig(); setApiKey(''); }}>Forget my key</button>
              <button type="button" className="btn flat small" onClick={() => { if (confirm('Erase all demo data on this device?')) resetDemo(); }}><RotateCcw size={15} />Reset demo data</button>
            </div>
          )}
          <p className="muted" style={{ marginTop: 26, fontSize: '0.86rem' }}>If Count Me In wins, the prize funds the AI, SMS and voice keys so the service runs for everyone — people like Linda will never see a key.</p>
        </section>
      </div>
    </main>
  );
}
