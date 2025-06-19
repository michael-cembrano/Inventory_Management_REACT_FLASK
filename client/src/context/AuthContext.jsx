import { createContext, useState, useContext, useEffect } from "react";
import ApiService from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (token) {
          ApiService.setToken(token);
          const result = await ApiService.verifyToken();
          if (result.valid) {
            setIsAuthenticated(true);
            
            // Fetch current user data
            try {
              const userResponse = await ApiService.getCurrentUser();
              setUserData(userResponse.user);
              setUserRole(userResponse.user.role);
            } catch (userError) {
              console.error("Failed to fetch user data:", userError);
            }
          } else {
            localStorage.removeItem("access_token");
            setIsAuthenticated(false);
            setUserRole(null);
            setUserData(null);
          }
        }
      } catch (error) {
        // Token is invalid, remove it
        localStorage.removeItem("access_token");
        setIsAuthenticated(false);
        setUserRole(null);
        setUserData(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData) => {
    setIsAuthenticated(true);
    setUserRole(userData?.role || null);
    setUserData(userData || null);
  };

  const logout = () => {
    ApiService.logout();
    setIsAuthenticated(false);
    setUserRole(null);
    setUserData(null);
  };
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      login, 
      logout, 
      userRole, 
      userData,
      isAdmin: userRole === 'admin',
      isStaff: userRole === 'staff',
      isUser: userRole === 'user'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
