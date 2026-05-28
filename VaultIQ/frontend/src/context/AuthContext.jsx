import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Authenticate user on page mount/reload using stored JWT token
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('vaultiq_token');
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.data);
        } catch (err) {
          console.error("Session restoration failed:", err);
          localStorage.removeItem('vaultiq_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(username, password);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('vaultiq_token', access_token);
      setUser(userData);
      return userData;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Login failed. Please check credentials.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      await authAPI.register(username, password);
      // Automatically login after successful registration
      return await login(username, password);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Registration failed.';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('vaultiq_token');
    setUser(null);
  };

  const updateApiKeys = async (openaiKey, geminiKey) => {
    try {
      const response = await authAPI.updateKeys(openaiKey, geminiKey);
      setUser(response.data);
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to update API keys.';
      throw new Error(errMsg);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateApiKeys }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
};
