import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [status, setStatus] = useState('verifying');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMsg('Missing token in URL');
      return;
    }

    let cancelled = false;
    api
      .get(`/auth/verify-email?token=${token}`)
      .then((res) => {
        if (cancelled) return;
        setStatus('success');
        setMsg(res.data.message || 'Email verified successfully');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMsg(err.response?.data?.message || 'Verification failed');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="container">
      <h1>Email verification</h1>

      {status === 'verifying' && <p>⏳ Verifying…</p>}
      {status === 'success' && <div className="alert success">{msg}</div>}
      {status === 'error' && <div className="alert error">{msg}</div>}

      <p className="muted">
        <Link to="/login">Go to login</Link>
      </p>
    </div>
  );
}