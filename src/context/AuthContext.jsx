import React from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    authService.init().then(() => {
      setUser(authService.getUserSession());
      setAdmin(authService.getAdminSession());
      setReady(true);
    });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const loggedIn = await authService.loginWithGoogle();
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (payload) => {
    return authService.registerUser(payload);
  }, []);

  const login = useCallback(async (payload) => {
    const loggedIn = await authService.loginUser(payload);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const refreshUser = useCallback(async (userId) => {
    if (!userId) return null;
    const updated = await authService.refreshUser(userId);
    if (updated) setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(() => {
    authService.logoutUser();
    setUser(null);
  }, []);

  const adminLogin = useCallback(async (payload) => {
    const loggedInAdmin = await authService.loginAdmin(payload);
    setAdmin(loggedInAdmin);
    return loggedInAdmin;
  }, []);

  const adminLogout = useCallback(() => {
    authService.logoutAdmin();
    setAdmin(null);
  }, []);

  const chooseSubscription = useCallback(
    async (plan) => {
      if (!user) throw new Error("No user is signed in.");
      const updated = await authService.chooseSubscription(user.id, plan);
      setUser(updated);
      return updated;
    },
    [user]
  );

  const savePaymentProof = useCallback(
    async (paymentProof) => {
      if (!user) throw new Error("No user is signed in.");
      const updated = await authService.savePaymentProof(user.id, paymentProof);
      setUser(updated);
      return updated;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        ready,
        user,
        admin,
        loginWithGoogle,
        register,
        login,
        refreshUser,
        logout,
        adminLogin,
        adminLogout,
        chooseSubscription,
        savePaymentProof,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
