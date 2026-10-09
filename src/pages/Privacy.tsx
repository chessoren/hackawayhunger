import { Link } from 'react-router-dom';
import { Lock, Fingerprint, CheckCircle2, Trash2, EyeOff, BarChart3, Ban, KeyRound } from 'lucide-react';
import { Logo } from '../components/ui';

const ITEMS = [
  [Lock, 'Minimal data', 'First name, phone, language, hours. No SNAP case number.'],
  [Fingerprint, 'Pseudonymous ledger', 'A salted hash, never the phone number.'],
  [CheckCircle2, 'Consent every time', 'Nothing goes to the State without a YES, logged in the ledger.'],
  [Trash2, 'Erase by SMS', 'Text DELETE and everything about you is erased.'],
  [EyeOff, 'Host sites see little', 'A first name and a time slot — never your file.'],
  [BarChart3, 'Aggregated public data', 'No dashboard cell shows fewer than 10 people.'],
  [Ban, 'No resale, no ads', 'No commercial use of any data.'],
  [KeyRound, 'Your AI key', 'Stays in your browser and goes only to the provider you chose.'],
] as const;

export default function Privacy() {
  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '34px 20px 60px' }}>
      <Link to="/" className="row" style={{ textDecoration: 'none', fontWeight: 800 }}><Logo size={40} /> Count Me In</Link>
      <h1 className="display hero-title" style={{ marginTop: 26 }}>Privacy, by design</h1>
      <div className="grid two" style={{ marginTop: 20 }}>
        {ITEMS.map(([Icon, t, d], i) => (
          <div key={t} className="panel tight row" style={{ flexWrap: 'nowrap' }}>
            <span className={`ibtn ${['blue', 'yellow', 'lime'][i % 3]}`}><Icon size={19} /></span>
            <div><b>{t}</b><div className="muted">{d}</div></div>
          </div>
        ))}
      </div>
    </main>
  );
}
