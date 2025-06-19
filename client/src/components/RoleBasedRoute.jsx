import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Component for protecting routes based on user roles
 * @param {Object} props 
 * @param {JSX.Element} props.element - The component to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles allowed to access this route
 * @returns {JSX.Element}
 */
const RoleBasedRoute = ({ element, allowedRoles }) => {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If no roles specified, allow all authenticated users
  if (!allowedRoles || allowedRoles.length === 0) {
    return element;
  }

  // Check if user's role is in the allowed roles
  if (allowedRoles.includes(userRole)) {
    return element;
  }

  // Redirect to dashboard if not authorized
  return <Navigate to="/" replace />;
};

export default RoleBasedRoute;