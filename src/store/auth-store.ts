import { create } from "zustand";
import { api } from "../lib/api/client";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isInitialized: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<AuthResponse>("/auth/login", { email, password });
      set({
        user: res.data.user,
        accessToken: res.data.accessToken,
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
      await api.post<{ success: boolean }>("/auth/logout");
    } catch {
    } finally {
      set({ user: null, accessToken: null, isLoading: false });
    }
  },

  refreshSession: async () => {
    try {
      const res = await api.post<AuthResponse>("/auth/refresh");
      set({ user: res.data.user, accessToken: res.data.accessToken, isInitialized: true });
      return true;
    } catch {
      set({ user: null, accessToken: null, isInitialized: true });
      return false;
    }
  },

  init: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    await get().refreshSession();
    set({ isLoading: false, isInitialized: true });
  },
}));
