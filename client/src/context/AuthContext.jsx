import { createContext, useState, useContext, useEffect } from "react";
import ApiService from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
          } else {
            localStorage.removeItem("access_token");
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        // Token is invalid, remove it
        localStorage.removeItem("access_token");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    ApiService.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
