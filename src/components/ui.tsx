import { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="24" fill="none" stroke="#dbeee1" strokeWidth="8" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="#F28021" strokeWidth="8" strokeLinecap="round" strokeDasharray="113 151" transform="rotate(-90 32 32)" />
      <text x="32" y="38.5" fontFamily="Inter, Arial" fontWeight="800" fontSize="17" textAnchor="middle" fill="#12703f">80</text>
    </svg>
  );
}

export function Gauge({ done, goal = 80, size = 150, label = 'hours' }: { done: number; goal?: number; size?: number; label?: string }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, done / goal);
  const color = pct >= 1 ? '#12703f' : '#F28021';
  return (
    <div className="gauge" role="img" aria-label={`${done} of ${goal} ${label}`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e7efe9" strokeWidth={14} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="center">
        <div className="num" style={{ fontSize: size / 4.2 }}>{done}</div>
        <div className="muted" style={{ fontSize: Math.max(11, size / 13) }}>of {goal} {label}</div>
      </div>
    </div>
  );
}

export function Layout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand"><Logo /> Count Me In</Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/phone">Person</NavLink>
          <NavLink to="/coordinator">Coordinator</NavLink>
          <NavLink to="/navigator">Navigator</NavLink>
          <NavLink to="/dashboard">Impact map</NavLink>
          <NavLink to="/stage">Live demo</NavLink>
          <NavLink to="/verify">Verify</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="page" style={wide ? { maxWidth: 1400 } : undefined}>{children}</main>
      <footer className="footer">
        Count Me In · open source (MIT) · built for Hack Away Hunger 2026 (dsmHack × Corteva) · Demo data is illustrative · <Link to="/rules">Iowa rules file</Link> · <Link to="/privacy">Privacy</Link>
      </footer>
    </>
  );
}
