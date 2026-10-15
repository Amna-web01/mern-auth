import { useAuth } from '../context/AuthContext';
import RoleGuard from '../components/RoleGuard';

export default function Dashboard() {
  const { user, logoutAll } = useAuth();

  return (
    <div className="container wide">
      <h1>Dashboard</h1>

      <div className="card">
        <h2>Profile</h2>
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Role:</strong>{' '}
          <span className={`badge ${user.role}`}>{user.role}</span>
        </p>
        <p>
          <strong>Email verified:</strong>{' '}
          {user.isEmailVerified ? '✅ Yes' : '❌ No'}
        </p>
        {user.avatar && (
          <p>
            <img
              src={user.avatar}
              alt="avatar"
              width="60"
              style={{ borderRadius: '50%' }}
            />
          </p>
        )}
        {user.lastLogin && (
          <p>
            <strong>Last login:</strong>{' '}
            {new Date(user.lastLogin).toLocaleString()}
          </p>
        )}
      </div>

      <div className="card">
        <h2>Role-based content</h2>
        <RoleGuard roles={['admin']}>
          <p className="alert success">🔴 You are an Admin — full access.</p>
        </RoleGuard>
        <RoleGuard roles={['manager', 'admin']}>
          <p className="alert success">🟠 You have Manager privileges.</p>
        </RoleGuard>
        <RoleGuard roles={['user']}>
          <p className="alert success">🟢 Standard user view.</p>
        </RoleGuard>
      </div>

      <div className="card">
        <h2>Actions</h2>
        <button className="btn-danger" onClick={logoutAll}>
          Logout from all devices
        </button>
      </div>
    </div>
  );
}