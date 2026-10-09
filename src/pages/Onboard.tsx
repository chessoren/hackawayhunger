import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/ui';
import { HostSite, MISSION_LABEL, MissionType, RecurringSlot } from '../data/sites';
import { newKeyPair } from '../core/crypto';
import { update } from '../app/store';
import { LANGUAGES } from '../core/i18n';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STEPS = ['Organization', 'Missions', 'Time slots', 'Access', 'Poster'];

/** Geocode via OpenStreetMap Nominatim (no key). Falls back to downtown Des Moines. */
async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
    const j = (await r.json()) as { lat: string; lon: string }[];
    return j[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
  } catch {
    return null;
  }
}

export default function Onboard() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [startedAt] = useState(Date.now());
  const [site, setSite] = useState({ name: '', kind: 'pantry' as HostSite['kind'], address: '', coordinator: '', coordinatorPhone: '' });
  const [missions, setMissions] = useState<MissionType[]>(['distribution', 'sorting']);
  const [slots, setSlots] = useState<RecurringSlot[]>([{ id: 's1', weekday: 2, start: '09:00', end: '12:00', mission: 'distribution', capacity: 4 }]);
  const [langs, setLangs] = useState<string[]>(['en']);
  const [minAge, setMinAge] = useState(16);
  const [accessible, setAccessible] = useState(true);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const pos = (await geocode(site.address)) ?? { lat: 41.5868, lng: -93.625 };
    const keys = newKeyPair();
    const id = site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Math.random().toString(36).slice(2, 5);
    const code = String(1000 + Math.floor(Math.random() * 8999));
    const full: HostSite = { id, ...site, ...pos, languages: langs, minAge, accessible, code, slots: slots.map((s, i) => ({ ...s, id: `${id}-${i}` })), coordinatorKey: keys.publicKey, createdAt: new Date().toISOString() };
    update((d) => { d.sites.push(full); d.siteKeys[id] = keys; });
    setSaving(false);
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    alert(`${site.name} is live — set up in ${minutes} minute${minutes > 1 ? 's' : ''}. Print your poster from the Coordinator screen.`);
    nav('/coordinator');
  }

  const canNext = [site.name && site.address && site.coordinator, missions.length, slots.length, true, true][step];

  return (
    <Layout>
      <h1 className="display" style={{ fontSize: '3.2rem', margin: 0 }}>Become a host site</h1>
      <div className="subtitle">About 10 minutes · zero cost · nothing to install</div>
      <div className="row" style={{ margin: "10px 0 20px" }}><span className="pill lime"><span className="dot" />You choose the missions</span><span className="pill yellow">Decline any slot</span></div>
      <div className="steps">{STEPS.map((s, i) => <span key={s} className={i === step ? 'on' : ''}>{i + 1}. {s}</span>)}</div>
      <div className="panel">
        {step === 0 && (
          <div className="grid two">
            <div className="field"><label>Organization name</label><input value={site.name} onChange={(e) => setSite({ ...site, name: e.target.value })} placeholder="St. Mark's Food Pantry" /></div>
            <div className="field"><label>Type</label>
              <select value={site.kind} onChange={(e) => setSite({ ...site, kind: e.target.value as HostSite['kind'] })}>
                <option value="pantry">Food pantry / food bank</option><option value="faith">Faith community</option><option value="public">Public agency / library</option><option value="garden">Community garden</option><option value="corporate">Corporate volunteer program</option><option value="school">School</option>
              </select>
            </div>
            <div className="field"><label>Address</label><input value={site.address} onChange={(e) => setSite({ ...site, address: e.target.value })} placeholder="123 Main St, Des Moines, IA" /></div>
            <div className="field"><label>Coordinator first name</label><input value={site.coordinator} onChange={(e) => setSite({ ...site, coordinator: e.target.value })} /></div>
            <div className="field"><label>Coordinator phone</label><input value={site.coordinatorPhone} onChange={(e) => setSite({ ...site, coordinatorPhone: e.target.value })} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="grid three">
            {(Object.keys(MISSION_LABEL) as MissionType[]).map((m) => (
              <label key={m} className="check tile"><input type="checkbox" checked={missions.includes(m)} onChange={(e) => setMissions(e.target.checked ? [...missions, m] : missions.filter((x) => x !== m))} />{MISSION_LABEL[m]}</label>
            ))}
          </div>
        )}
        {step === 2 && (
          <div>
            <table>
              <thead><tr><th>Day</th><th>Start</th><th>End</th><th>Mission</th><th>Volunteers</th><th>Seated</th><th /></tr></thead>
              <tbody>
                {slots.map((s, i) => {
                  const set = (patch: Partial<RecurringSlot>) => setSlots(slots.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <tr key={i}>
                      <td><select value={s.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })}>{DAYS.map((d, k) => <option key={d} value={k}>{d}</option>)}</select></td>
                      <td><input type="time" value={s.start} onChange={(e) => set({ start: e.target.value })} /></td>
                      <td><input type="time" value={s.end} onChange={(e) => set({ end: e.target.value })} /></td>
                      <td><select value={s.mission} onChange={(e) => set({ mission: e.target.value as MissionType })}>{missions.map((m) => <option key={m} value={m}>{MISSION_LABEL[m]}</option>)}</select></td>
                      <td style={{ width: 90 }}><input type="number" min={1} value={s.capacity} onChange={(e) => set({ capacity: Number(e.target.value) })} /></td>
                      <td><input type="checkbox" checked={!!s.seated} onChange={(e) => set({ seated: e.target.checked, noLifting: e.target.checked })} aria-label="Seated work" /></td>
                      <td><button className="btn flat small" onClick={() => setSlots(slots.filter((_, j) => j !== i))}>Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="btn flat small" style={{ marginTop: 10 }} onClick={() => setSlots([...slots, { id: 's' + (slots.length + 1), weekday: 6, start: '09:00', end: '12:00', mission: missions[0], capacity: 4 }])}>+ Add a recurring slot</button>
          </div>
        )}
        {step === 3 && (
          <div className="grid two">
            <div>
              <label>Languages spoken on site</label>
              <div className="grid two">{LANGUAGES.map((l) => <label key={l.code} className="check"><input type="checkbox" checked={langs.includes(l.code)} onChange={(e) => setLangs(e.target.checked ? [...langs, l.code] : langs.filter((x) => x !== l.code))} />{l.native}</label>)}</div>
            </div>
            <div>
              <div className="field"><label>Minimum age</label><input type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} /></div>
              <label className="check"><input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} />Wheelchair accessible</label>
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <h3>Ready to go live</h3>
            <p>We will create your site, generate your coordinator signing key (it stays on this device), and give you a printable poster with your QR code and a 4-digit code for basic phones.</p>
            <ul className="muted"><li>You will only see first names and time slots — never anyone's SNAP file.</li><li>You only certify what you saw: arrival, departure, mission.</li></ul>
          </div>
        )}
        <div className="row" style={{ marginTop: 18 }}>
          {step > 0 && <button className="btn flat" onClick={() => setStep(step - 1)}>Back</button>}
          <span className="spacer" />
          {step < 4 ? <button className="btn blue" disabled={!canNext} onClick={() => setStep(step + 1)}>Next</button> : <button className="btn dark big" disabled={saving} onClick={finish}>{saving ? 'Creating…' : 'Go live'}</button>}
        </div>
      </div>
    </Layout>
  );
}
