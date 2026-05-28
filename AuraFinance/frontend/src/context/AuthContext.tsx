"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface UserProfile {
  id: number;
  email: string;
  spending_personality: string;
  created_at: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const API_BASE = "http://127.0.0.1:8000/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedToken = localStorage.getItem("app-token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);
    } else {
      setLoading(false);
      // If we are not on login/register/landing, redirect to landing or login
      if (pathname !== "/" && pathname !== "/login" && pathname !== "/register") {
        router.push("/login");
      }
    }
  }, []);

  const fetchUserProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
      } else {
        // Token expired/invalid
        logout();
      }
    } catch (e) {
      console.error("Failed to load user profile", e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) {
        const detail = await res.json();
        setError(detail.detail || "Authentication failed");
        return false;
      }
      
      const data = await res.json();
      localStorage.setItem("app-token", data.access_token);
      setToken(data.access_token);
      
      // Load user details
      const userRes = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`
        }
      });
      if (userRes.ok) {
        const profile = await userRes.json();
        setUser(profile);
        router.push("/dashboard");
        return true;
      }
      return false;
    } catch (e) {
      setError("Network error. Please check if backend server is running.");
      return false;
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      if (!res.ok) {
        const detail = await res.json();
        setError(detail.detail || "Registration failed");
        return false;
      }
      
      // Automatically login after successful registration
      return await login(email, password);
    } catch (e) {
      setError("Network error. Please check if backend server is running.");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("app-token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const currentToken = token || localStorage.getItem("app-token");
    if (!currentToken) {
      logout();
      throw new Error("No authorization token");
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }

    const mergedOptions: RequestInit = {
      cache: "no-store",
      ...options,
      headers
    };

    const res = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
    
    if (res.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
    
    if (!res.ok) {
      const errorDetail = await res.json().catch(() => ({ detail: "API request failed" }));
      throw new Error(errorDetail.detail || "API request failed");
    }

    // Handle file downloads/pdf streams vs JSON responses
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/pdf")) {
      return res.blob();
    }
    
    return res.json();
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        apiFetch,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
