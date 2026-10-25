import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function AuthPage({ mode }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = mode === 'signup';

  const arrived = (location.state || {});
  const [form, setForm] = useState({ name: '', email: arrived.email || '', password: '' });
  const [notice] = useState(arrived.notice || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isSignup) {
        await api.signup({ name: form.name, email: form.email, password: form.password });
        navigate('/login', { replace: true, state: { notice: 'Account created. Please log in to continue.', email: form.email } });
      } else {
        await login({ email: form.email, password: form.password });
        navigate('/', { replace: true }); 
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <div className="brand"><span className="logo">₹</span> Spendwise</div>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {isSignup ? 'Sign up with your email and a password.' : 'Log in with your email and password.'}
        </p>

        {notice && <p className="ok banner-ok" role="status">{notice}</p>}

        {isSignup && (
          <label>Name
            <input value={form.name} onChange={set('name')} autoComplete="name" placeholder="Your name" required />
          </label>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" required />
        </label>
        <label>Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder="At least 8 characters"
            required
          />
        </label>

        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Please wait…' : isSignup ? 'Sign up' : 'Log in'}
        </button>

        <p className="muted small center-text">
          {isSignup ? (
            <>Already have an account? <Link to="/login">Log in</Link></>
          ) : (
            <>New here? <Link to="/signup">Create an account</Link></>
          )}
        </p>
      </form>
    </main>
  );
}