import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getLlmConfig, useDB } from './app/store';
import Setup from './pages/Setup';
import Home from './pages/Home';
import Phone from './pages/Phone';
import Coordinator from './pages/Coordinator';
import Onboard from './pages/Onboard';
import Dashboard from './pages/Dashboard';
import Verify from './pages/Verify';
import Rules from './pages/Rules';
import Stage from './pages/Stage';
import CheckIn from './pages/CheckIn';
import Navigator from './pages/Navigator';
import Privacy from './pages/Privacy';

/** The AI key is mandatory: every screen except verification and privacy asks for it first. */
function KeyGate({ children }: { children: JSX.Element }) {
  useDB();
  const loc = useLocation();
  if (!getLlmConfig()) return <Navigate to={`/setup?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/settings" element={<Setup />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/" element={<KeyGate><Home /></KeyGate>} />
      <Route path="/phone" element={<KeyGate><Phone /></KeyGate>} />
      <Route path="/coordinator" element={<KeyGate><Coordinator /></KeyGate>} />
      <Route path="/onboard" element={<KeyGate><Onboard /></KeyGate>} />
      <Route path="/dashboard" element={<KeyGate><Dashboard /></KeyGate>} />
      <Route path="/navigator" element={<KeyGate><Navigator /></KeyGate>} />
      <Route path="/rules" element={<KeyGate><Rules /></KeyGate>} />
      <Route path="/stage" element={<KeyGate><Stage /></KeyGate>} />
      <Route path="/c/:code" element={<KeyGate><CheckIn /></KeyGate>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
