import React, { createContext, useContext, useEffect, useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase.ts";
import { apiRequest, setAuthToken } from "../services/api.ts";

export interface AppUser {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  role: "admin" | "faculty";
  departmentId: number | null;
  departmentName?: string | null;
  designation: string | null;
  phone?: string | null;
  accountStatus: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  hasAdminInSystem: boolean;
  refreshSystemStatus: () => Promise<void>;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  setupFirstAdmin: (data: {
    fullName: string;
    email: string;
    password: string;
    designation?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "ssmiet_hallsync_session_jwt";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAdminInSystem, setHasAdminInSystem] = useState(true);

  const refreshSystemStatus = async () => {
    try {
      const status = await apiRequest<{ hasAdmin: boolean }>("/system/status");
      setHasAdminInSystem(status.hasAdmin);
    } catch (err) {
      console.error("Failed to check system status:", err);
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await apiRequest<{ user: AppUser }>("/auth/me");
      setUser(data.user);
    } catch (err) {
      setAuthToken(null);
      sessionStorage.removeItem(SESSION_KEY);
      setUser(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await refreshSystemStatus();
      const savedToken = sessionStorage.getItem(SESSION_KEY);
      if (savedToken) {
        setAuthToken(savedToken);
        await refreshProfile();
      }
      setLoading(false);
    };
    init();
  }, []);

  const loginWithCredentials = async (email: string, password: string) => {
    const res = await apiRequest<{ user: AppUser; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    sessionStorage.setItem(SESSION_KEY, res.token);
    setUser(res.user);
    await refreshProfile();
  };

  const loginWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await credential.user.getIdToken();
    const res = await apiRequest<{ user: AppUser; token: string }>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    setAuthToken(res.token);
    sessionStorage.setItem(SESSION_KEY, res.token);
    setUser(res.user);
    await refreshSystemStatus();
    await refreshProfile();
  };

  const setupFirstAdmin = async (data: {
    fullName: string;
    email: string;
    password: string;
    designation?: string;
  }) => {
    const res = await apiRequest<{ user: AppUser; token: string }>(
      "/auth/setup-initial-admin",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
    setAuthToken(res.token);
    sessionStorage.setItem(SESSION_KEY, res.token);
    setUser(res.user);
    setHasAdminInSystem(true);
    await refreshProfile();
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore Firebase signOut error if logged in via email/password
    }
    setAuthToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasAdminInSystem,
        refreshSystemStatus,
        loginWithCredentials,
        loginWithGoogle,
        setupFirstAdmin,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
