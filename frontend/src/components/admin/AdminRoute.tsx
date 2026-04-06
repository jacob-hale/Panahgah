import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AdminRoute() {
  const { isLoading, authSession } = useAuth();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Checking access…</span>
        </div>
      </div>
    );
  }

  if (!authSession?.roles.includes('Admin')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
