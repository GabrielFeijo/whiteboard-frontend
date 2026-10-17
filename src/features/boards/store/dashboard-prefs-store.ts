"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandCookieStorage } from "@/lib/cookies/cookie-storage";
import { Role } from "@/shared";

export const DashboardViewMode = {
  GRID: "grid",
  LIST: "list",
} as const;
export type DashboardViewMode =
  (typeof DashboardViewMode)[keyof typeof DashboardViewMode];

export const DashboardRoleFilter = {
  ALL: "ALL",
  OWNER: Role.OWNER,
  MEMBER: "MEMBER",
} as const;
export type DashboardRoleFilter =
  (typeof DashboardRoleFilter)[keyof typeof DashboardRoleFilter];

export const DashboardSortBy = {
  UPDATED_AT: "updatedAt",
  TITLE: "title",
} as const;
export type DashboardSortBy =
  (typeof DashboardSortBy)[keyof typeof DashboardSortBy];

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
      viewMode: DashboardViewMode.GRID,
      filterRole: DashboardRoleFilter.ALL,
      sortBy: DashboardSortBy.UPDATED_AT,
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
