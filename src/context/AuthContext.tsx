/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  loginWithUsername,
  logout,
  mapAuthUser,
  registerWithUsername,
  subscribeAuthState,
  validateUsername,
  type AuthAccount
} from "../services/auth";

type AuthContextValue = {
  account: AuthAccount | null;
  isAuthLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    return subscribeAuthState(async (user) => {
      if (!user) {
        setAccount(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const nextAccount = await mapAuthUser(user);

        if (nextAccount.isDeleted) {
          await logout();
          setAccount(null);
          return;
        }

        setAccount(nextAccount);
      } finally {
        setIsAuthLoading(false);
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      account,
      isAuthLoading,
      async login(username, password) {
        if (!validateUsername(username)) {
          throw new Error("Username harus 3-32 karakter dan hanya boleh huruf, angka, titik, strip, atau underscore.");
        }

        setAccount(await loginWithUsername(username, password));
      },
      async register(username, password) {
        if (!validateUsername(username)) {
          throw new Error("Username harus 3-32 karakter dan hanya boleh huruf, angka, titik, strip, atau underscore.");
        }

        if (password.length < 6) {
          throw new Error("Password minimal 6 karakter.");
        }

        setAccount(await registerWithUsername(username, password));
      },
      async signOut() {
        await logout();
        setAccount(null);
      }
    };
  }, [account, isAuthLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  }

  return context;
}
