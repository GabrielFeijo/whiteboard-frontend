import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../lib/api/client";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  init: () => Promise<void>;
}

const dummyStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isInitialized: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await api.post<AuthResponse>("/auth/login", { email, password });
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken ?? null,
            isLoading: false,
            isInitialized: true,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true });
        try {
          const res = await api.post<AuthResponse>("/auth/register", { email, password, name });
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken ?? null,
            isLoading: false,
            isInitialized: true,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          const token = get().refreshToken;
          await api.post<{ success: boolean }>("/auth/logout", { refreshToken: token });
        } catch {
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      refreshSession: async () => {
        try {
          const currentRefresh = get().refreshToken;
          const res = await api.post<AuthResponse>("/auth/refresh", {
            refreshToken: currentRefresh,
          });
          set({
            user: res.data.user,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken ?? currentRefresh,
            isInitialized: true,
          });
          return true;
        } catch {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isInitialized: true,
          });
          return false;
        }
      },

      init: async () => {
        if (get().isInitialized && get().accessToken) return;
        if (!get().accessToken && get().refreshToken) {
          set({ isLoading: true });
          await get().refreshSession();
          set({ isLoading: false });
          return;
        }
        set({ isInitialized: true, isLoading: false });
      },
    }),
    {
      name: "wb-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : dummyStorage,
      ),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
        }
      },
    },
  ),
);
