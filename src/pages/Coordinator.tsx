import { Link } from 'react-router-dom';
import { Layout } from '../components/ui';
import CoordinatorPanel from '../components/CoordinatorPanel';

export default function Coordinator() {
  return (
    <Layout>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1>Coordinator</h1>
          <p className="lead" style={{ margin: 0 }}>The paper sign-in sheet, replaced: today's list on your phone, one tap to confirm, a report ready for funders.</p>
        </div>
        <span className="spacer" />
        <Link className="btn orange" to="/onboard">+ Register a new host site</Link>
      </div>
      <CoordinatorPanel />
    </Layout>
  );
}
