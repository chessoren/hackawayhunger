import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Layout } from '../components/ui';
import CoordinatorPanel from '../components/CoordinatorPanel';

export default function Coordinator() {
  return (
    <Layout>
      <div className="row" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <h1 className="display" style={{ fontSize: '3.2rem', margin: 0 }}>Host site</h1>
          <div className="subtitle">The paper sign-in sheet, replaced</div>
          <div className="row" style={{ marginTop: 10 }}><span className="pill lime"><span className="dot" />One-tap validation</span><span className="pill yellow">First name only</span></div>
        </div>
        <span className="spacer" />
        <Link className="btn yellow" to="/onboard"><Plus size={18} />Register a host site</Link>
      </div>
      <CoordinatorPanel />
    </Layout>
  );
}
