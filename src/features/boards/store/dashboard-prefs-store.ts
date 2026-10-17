"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandCookieStorage } from "@/lib/cookies/cookie-storage";

export type DashboardViewMode = "grid" | "list";
export type DashboardRoleFilter = "ALL" | "OWNER" | "MEMBER";
export type DashboardSortBy = "updatedAt" | "title";

export interface DashboardPrefsState {
  viewMode: DashboardViewMode;
  filterRole: DashboardRoleFilter;
  sortBy: DashboardSortBy;
  setViewMode: (viewMode: DashboardViewMode) => void;
  setFilterRole: (filterRole: DashboardRoleFilter) => void;
  setSortBy: (sortBy: DashboardSortBy) => void;
}

export const useDashboardPrefsStore = create<DashboardPrefsState>()(
  persist(
    (set) => ({
      viewMode: "grid",
      filterRole: "ALL",
      sortBy: "updatedAt",
      setViewMode: (viewMode) => set({ viewMode }),
      setFilterRole: (filterRole) => set({ filterRole }),
      setSortBy: (sortBy) => set({ sortBy }),
    }),
    {
      name: "wb_dashboard_prefs",
      storage: createJSONStorage(() => zustandCookieStorage),
    }
  )
);
