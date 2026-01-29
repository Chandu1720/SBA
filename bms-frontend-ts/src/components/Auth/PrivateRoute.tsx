import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

interface PrivateRouteProps {
  children: React.ReactElement;
  permission?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, permission }) => {
  const { user, authLoading } = useUser();

  // 🔒 CRITICAL: wait for auth to resolve
  if (authLoading) {
    return null; // or spinner
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin has full access
  if (user.role === 'Admin') {
    return children;
  }

  if (permission && !user.permissions?.includes(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
