import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * role="user"  -> requires an active user session, else redirects to /login
 * role="admin" -> requires an active admin session, else redirects to /admin/login
 *
 * This is the single gate that keeps regular users out of the admin
 * dashboard and keeps an admin session from doubling as a user session.
 */
export default function ProtectedRoute({ role, children }) {
  const { ready, user, admin } = useAuth();

  if (!ready) return null;

  if (role === "admin" && !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (role === "user" && !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
