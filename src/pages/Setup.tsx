import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Logo } from '../components/ui';
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
    if (g && g !== provider) {
      setProvider(g);
      setModel(DEFAULT_MODELS[g]);
    }
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
    <main className="page" style={{ maxWidth: 760 }}>
      <div className="row" style={{ marginBottom: 18 }}>
        <Logo size={56} />
        <div>
          <h1 style={{ margin: 0 }}>Count Me In</h1>
          <div className="muted">Every hour counts. So do you.</div>
        </div>
      </div>

      <div className="card">
        <h2>Connect an AI key to start</h2>
        <p>
          Count Me In uses AI to understand people in their own words and language, and to read photos of administrative letters.
          For the hackathon judging, <strong>the app runs on your own key</strong> (Claude or OpenAI).
        </p>
        <ul className="muted" style={{ marginTop: 0 }}>
          <li>Your key stays in this browser and is sent only to the provider you choose — never to our servers, never in the code.</li>
          <li>Eligibility is never decided by the AI: a deterministic, cited rules engine does that.</li>
          <li>If Count Me In wins, the team will fund the keys so the service runs for everyone — this step is temporary.</li>
        </ul>

        <form onSubmit={submit}>
          <div className="field">
            <label>AI provider</label>
            <div className="row">
              {(['anthropic', 'openai'] as Provider[]).map((p) => (
                <button type="button" key={p} className={`btn ${provider === p ? '' : 'secondary'}`} onClick={() => { setProvider(p); setModel(DEFAULT_MODELS[p]); }} aria-pressed={provider === p}>
                  {p === 'anthropic' ? 'Claude (Anthropic)' : 'OpenAI'}
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
            <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember this key on this device (otherwise it is forgotten when you close the tab)</label>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="row">
            <button className="btn big" disabled={busy || !apiKey}>{busy ? 'Checking key…' : 'Check key and start'}</button>
            {existing && <button type="button" className="btn secondary" onClick={() => { clearLlmConfig(); setApiKey(''); }}>Forget my key</button>}
          </div>
        </form>
      </div>

      <div className="card tight" style={{ marginTop: 16 }}>
        <div className="row">
          <div>
            <strong>Checking an attestation?</strong> <span className="muted">No key needed.</span>
          </div>
          <span className="spacer" />
          <Link className="btn secondary small" to="/verify">Verify a document</Link>
          {existing && <button className="btn ghost small" onClick={() => { if (confirm('Erase all demo data on this device?')) resetDemo(); }}>Reset demo data</button>}
        </div>
      </div>
    </main>
  );
}
