import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Field, PageShell, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../lib/api';

export default function AdminLogin() {
  const { isAdmin, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(form.email, form.password); navigate('/admin/dashboard'); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <PageShell className="grid place-items-center">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="font-display text-3xl font-extrabold">Admin sign in</h1>
        <Field label="Email"><input className="input" type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        {error && <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{error}</p>}
        <button className="btn-blue w-full" disabled={busy}>{busy ? <Spinner /> : 'Sign in'}</button>
      </form>
    </PageShell>
  );
}
