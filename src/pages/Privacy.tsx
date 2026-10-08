import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';

export default function Privacy() {
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <Link to="/" className="brand"><Logo /> Count Me In</Link>
      <h1 style={{ marginTop: 16 }}>Privacy, by design</h1>
      <ul style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
        <li><strong>Minimal data:</strong> first name, phone, language, hours. No SNAP case number stored in clear.</li>
        <li><strong>Pseudonymous ledger:</strong> the hours ledger stores a salted hash, never the phone number.</li>
        <li><strong>Explicit consent, every time:</strong> nothing is sent to the State without a “YES” from the person, logged in the ledger.</li>
        <li><strong>Right to erasure by SMS:</strong> text DELETE and everything about you is erased.</li>
        <li><strong>Host sites see little:</strong> a first name and a time slot — never why someone volunteers, never their file.</li>
        <li><strong>Public data is aggregated:</strong> no dashboard cell shows fewer than 10 people.</li>
        <li><strong>No resale, no ads, no commercial use.</strong></li>
        <li><strong>AI keys:</strong> in this hackathon build, the AI key you enter stays in your browser and goes only to the provider you chose.</li>
      </ul>
    </main>
  );
}
