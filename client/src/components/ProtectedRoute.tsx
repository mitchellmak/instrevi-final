import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
