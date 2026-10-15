import { useAuth } from '../context/AuthContext';

/**
 * Conditionally renders children based on the current user's role.
 * Usage:
 *   <RoleGuard roles={['admin']}>
 *     <DeleteButton />
 *   </RoleGuard>
 */
export default function RoleGuard({ roles, children, fallback = null }) {
  const { user } = useAuth();
  if (!user) return fallback;
  if (!roles || roles.length === 0) return children;
  if (!roles.includes(user.role)) return fallback;
  return children;
}