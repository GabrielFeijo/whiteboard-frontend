"use client";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";

interface BoardsEmptyStateProps {
  hasSearchQuery: boolean;
  onCreateClick: () => void;
}

export function BoardsEmptyState({
  hasSearchQuery,
  onCreateClick,
}: BoardsEmptyStateProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface/50 py-16 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border-strong bg-surface text-text-muted shadow-xs mb-3">
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 12h8M12 8v8" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-text-primary">
        {hasSearchQuery
          ? t("dashboard.emptyState.search.title")
          : t("dashboard.emptyState.default.title")}
      </h3>
      <p className="mt-1 text-xs text-text-muted max-w-sm">
        {hasSearchQuery
          ? t("dashboard.emptyState.search.description")
          : t("dashboard.emptyState.default.description")}
      </p>
      {!hasSearchQuery && (
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateClick}
          className="mt-4"
        >
          {t("dashboard.emptyState.default.cta")}
        </Button>
      )}
    </div>
  );
}
