import { Link } from 'react-router-dom';
import { EmptyState, PageShell } from '../components/ui';

export default function NotFound() {
  return <PageShell><EmptyState title="Page not found" text="That page does not exist." action={<Link className="btn-blue" to="/">Go home</Link>} /></PageShell>;
}
