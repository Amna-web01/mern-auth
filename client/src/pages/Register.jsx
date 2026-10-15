import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs?.length) {
        setError(errs.map((x) => x.message).join(', '));
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Create account</h1>
      <p className="muted">Get started in seconds</p>

      {error && <div className="alert error">{error}</div>}

      <form onSubmit={onSubmit}>
        <input
          name="name"
          placeholder="Full name"
          value={form.name}
          onChange={onChange}
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={onChange}
          autoComplete="email"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8 chars, 1 letter + 1 number)"
          value={form.password}
          onChange={onChange}
          autoComplete="new-password"
          required
          minLength={8}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create Account'}
        </button>
      </form>

      <p className="muted">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}