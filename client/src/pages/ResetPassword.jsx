import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        password,
      });
      setMsg(data.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Reset password</h1>
      <p className="muted">Choose a new password for your account.</p>

      {msg && <div className="alert success">{msg}</div>}
      {error && <div className="alert error">{error}</div>}
      {!token && <div className="alert error">Missing token in URL</div>}

      <form onSubmit={onSubmit}>
        <input
          type="password"
          placeholder="New password (min 8, letter + number)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <button type="submit" disabled={!token || loading}>
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      <p className="muted">
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}