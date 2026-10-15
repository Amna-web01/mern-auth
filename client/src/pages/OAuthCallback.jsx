import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) navigate('/dashboard', { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser, navigate]);

  return (
    <div className="container">
      <div className="loading-screen">
        <div className="spinner" />
        <p>Completing sign-in…</p>
      </div>
    </div>
  );
}