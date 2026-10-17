"use client";

import {
  useDashboardPrefsStore,
  type DashboardRoleFilter,
} from "@/features/boards/store/dashboard-prefs-store";
import { useI18n } from "@/i18n/context";

interface BoardsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  totalCount: number;
}

export function BoardsFilterBar({
  searchQuery,
  onSearchChange,
  totalCount,
}: BoardsFilterBarProps) {
  const { t } = useI18n();
  const { viewMode, filterRole, setViewMode, setFilterRole } = useDashboardPrefsStore();

  const filterButtons: { role: DashboardRoleFilter; label: string }[] = [
    { role: "ALL", label: t("dashboard.filters.tabs.all") },
    { role: "OWNER", label: t("dashboard.filters.tabs.owned") },
    { role: "MEMBER", label: t("dashboard.filters.tabs.shared") },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-subtle">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-64">
          <svg
            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-muted pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("dashboard.filters.searchPlaceholder")}
            className="w-full rounded-lg border border-border-strong bg-surface pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20 shadow-2xs"
          />
        </div>

        <div className="hidden md:flex items-center rounded-lg border border-border-subtle bg-surface p-0.5 shadow-2xs">
          {filterButtons.map((btn) => (
            <button
              key={btn.role}
              type="button"
              onClick={() => setFilterRole(btn.role)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filterRole === btn.role
                  ? "bg-surface-raised text-text-primary shadow-2xs border border-border-subtle/80"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-text-muted">
          {totalCount}{" "}
          {totalCount === 1
            ? t("dashboard.filters.counter.singular")
            : t("dashboard.filters.counter.plural")}
        </span>

        <div className="flex items-center rounded-lg border border-border-subtle bg-surface p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            title={t("dashboard.filters.viewMode.grid")}
            aria-label={t("dashboard.filters.viewMode.grid")}
            className={`p-1 rounded-md transition-colors ${
              viewMode === "grid"
                ? "bg-surface-raised text-text-primary shadow-2xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            title={t("dashboard.filters.viewMode.list")}
            aria-label={t("dashboard.filters.viewMode.list")}
            className={`p-1 rounded-md transition-colors ${
              viewMode === "list"
                ? "bg-surface-raised text-text-primary shadow-2xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
