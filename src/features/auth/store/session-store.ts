import { create } from "zustand";
import { api } from "@/lib/api/client";
import type { SessionUser } from "../types";

export type { SessionUser };

interface AuthSessionResponse {
  user: SessionUser;
}

export interface SessionState {
  user: SessionUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  hydrateUser: (user: SessionUser | null) => void;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (email: string, password: string, name: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  init: () => Promise<void>;
}

export const useSessionStore = create<SessionState>()((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,

  hydrateUser: (user) => {
    set({
      user,
      isInitialized: true,
      isLoading: false,
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<AuthSessionResponse>("/auth/login", { email, password });
      set({
        user: res.data.user,
        isLoading: false,
        isInitialized: true,
      });
      return res.data.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await api.post<AuthSessionResponse>("/auth/register", {
        email,
        password,
        name,
      });
      set({
        user: res.data.user,
        isLoading: false,
        isInitialized: true,
      });
      return res.data.user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post<{ success: boolean }>("/auth/logout").catch(() => null);
    } finally {
      set({
        user: null,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  refreshSession: async () => {
    try {
      const res = await api.post<AuthSessionResponse>("/auth/refresh");
      set({
        user: res.data.user,
        isInitialized: true,
      });
      return true;
    } catch {
      set({
        user: null,
        isInitialized: true,
      });
      return false;
    }
  },

  init: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });
    try {
      const res = await api.get<SessionUser>("/auth/me");
      set({
        user: res.data,
        isInitialized: true,
        isLoading: false,
      });
    } catch {
      set({
        user: null,
        isInitialized: true,
        isLoading: false,
      });
    }
  },
}));
