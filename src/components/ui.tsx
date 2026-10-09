import { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Home, MessageCircle, Handshake, LifeBuoy, Map, PlayCircle, ShieldCheck, Bell, Settings, ChevronLeft, Search, type LucideIcon,
} from 'lucide-react';
import { useDB } from '../app/store';

/** Brand mark: a ring that fills toward 80 hours, with a yellow core. */
export function Logo({ size = 40, dark = true }: { size?: number; dark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="18" fill={dark ? '#0c0c0d' : '#ffffff'} />
      <circle cx="32" cy="32" r="17" fill="none" stroke={dark ? '#3a3a3e' : '#ececea'} strokeWidth="7" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#8ecdf6" strokeWidth="7" strokeLinecap="round" strokeDasharray="80 107" transform="rotate(-90 32 32)" />
      <circle cx="32" cy="32" r="5" fill="#f8e25b" />
    </svg>
  );
}

export function Gauge({ done, goal = 80, size = 150, label = 'hours', color }: { done: number; goal?: number; size?: number; label?: string; color?: string }) {
  const stroke = Math.max(8, size / 11);
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, done / goal);
  const fill = color ?? (pct >= 1 ? '#a8d84a' : '#8ecdf6');
  return (
    <div className="gauge" role="img" aria-label={`${done} of ${goal} ${label}`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efefec" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={fill} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="center">
        <div className="num" style={{ fontSize: size / 3.4 }}>{done}</div>
        <div className="muted" style={{ fontSize: Math.max(10, size / 13), marginTop: 2 }}>of {goal} {label}</div>
      </div>
    </div>
  );
}

export function Stat({ value, label, icon: Icon }: { value: ReactNode; label: string; icon?: LucideIcon }) {
  return (
    <div className="stat">
      <div className="value">{value}</div>
      <div className="label">{Icon && <Icon size={14} strokeWidth={1.8} />}{label}</div>
    </div>
  );
}

/** "Unlock Bike"-style call to action. */
export function Unlock({ to, children, icon: Icon, onClick }: { to?: string; children: ReactNode; icon: LucideIcon; onClick?: () => void }) {
  const inner = (
    <>
      <span className="knob"><Icon size={22} strokeWidth={2} /></span>
      <span className="txt">{children}</span>
      <span className="chev">&gt;&gt;</span>
    </>
  );
  return to ? <Link to={to} className="unlock">{inner}</Link> : <button className="unlock" onClick={onClick}>{inner}</button>;
}

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/phone', label: 'Person — text the assistant', icon: MessageCircle },
  { to: '/coordinator', label: 'Host site coordinator', icon: Handshake },
  { to: '/navigator', label: 'Navigator console', icon: LifeBuoy },
  { to: '/dashboard', label: 'Impact map', icon: Map },
  { to: '/stage', label: 'Live demo', icon: PlayCircle },
  { to: '/verify', label: 'Verify an attestation', icon: ShieldCheck },
];

export function Layout({ children, title, wide, search }: { children: ReactNode; title?: string; wide?: boolean; search?: string }) {
  const db = useDB();
  const open = db.tickets.filter((t) => !t.done).length;
  return (
    <div className="app">
      <aside className="rail" aria-label="Main navigation">
        <Link to="/" className="brand-mark" aria-label="Count Me In home"><Logo size={44} /></Link>
        <button className="ibtn raised rail-extra" aria-label="Back" onClick={() => history.back()}><ChevronLeft size={20} /></button>
        <nav className="group">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `ibtn${isActive ? ' active' : ''}`} title={label} aria-label={label}>
              <Icon size={20} strokeWidth={1.8} />
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="group rail-extra">
          <Link to="/navigator" className="ibtn" aria-label={`${open} open requests`} title="Open requests">
            <Bell size={20} strokeWidth={1.8} />{open > 0 && <span className="badge">{open}</span>}
          </Link>
          <NavLink to="/settings" className={({ isActive }) => `ibtn${isActive ? ' active' : ''}`} aria-label="Settings" title="Settings"><Settings size={20} strokeWidth={1.8} /></NavLink>
        </div>
      </aside>
      <main className="main">
        <div className="canvas" style={wide ? { maxWidth: 1480 } : undefined}>
          {(title || search) && (
            <div className="topline">
              {title && <span className="title">{title}</span>}
              <span className="spacer" />
              {search && <div className="search"><span className="ibtn sm blue"><Search size={17} /></span>{search}</div>}
            </div>
          )}
          {children}
          <footer className="footer">
            Count Me In · open source (MIT) · Hack Away Hunger 2026 · dsmHack × Corteva · Demo data is illustrative · <Link to="/rules">Iowa rules file</Link> · <Link to="/privacy">Privacy</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}
