"use client";

import { useRouter } from "next/navigation";
import type { Role } from "@/shared";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { SyncProvider, SyncStatus } from "@/collab/sync-provider";
import { CollaboratorsList } from "@/features/studio/components/collaborators-list";
import { ConnectionStatusBadge } from "@/features/studio/components/connection-status-badge";
import { useI18n } from "@/i18n/context";

interface StudioHeaderProps {
  boardTitle: string;
  boardRole: Role;
  syncStatus: SyncStatus;
  provider: SyncProvider | null;
  followingClientId: number | null;
  onFollowUser: (targetId: number | null) => void;
  onOpenHistory: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
}

export function StudioHeader({
  boardTitle,
  boardRole,
  syncStatus,
  provider,
  followingClientId,
  onFollowUser,
  onOpenHistory,
  onOpenExport,
  onOpenShare,
}: StudioHeaderProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isReadOnly = boardRole === "VIEWER";

  return (
    <header className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto rounded-xl border border-border-strong bg-surface-raised/95 px-2.5 py-1.5 shadow-md backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.push("/boards")}
          title={t("studio.header.backToBoards")}
          aria-label={t("studio.header.backToBoards")}
          className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="h-3.5 w-px bg-border-subtle" />

        <h1 className="text-xs font-semibold text-text-primary max-w-40 sm:max-w-64 truncate">
          {boardTitle}
        </h1>

        {isReadOnly ? (
          <Badge variant="warning" className="text-[10px] py-0">
            {t("studio.header.readOnly")}
          </Badge>
        ) : (
          <ConnectionStatusBadge status={syncStatus} />
        )}
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <CollaboratorsList
          provider={provider}
          followingClientId={followingClientId}
          onFollowUser={onFollowUser}
        />

        <div className="hidden sm:flex items-center gap-1.5">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-border-strong bg-surface-raised/95 p-1 shadow-md backdrop-blur-md">
          <button
            type="button"
            onClick={onOpenHistory}
            title={t("studio.header.versionHistory")}
            aria-label={t("studio.header.versionHistory")}
            className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            title={t("studio.header.exportCanvas")}
            aria-label={t("studio.header.exportCanvas")}
            className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>

          {boardRole === "OWNER" && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenShare}
              className="gap-1.5 text-xs font-semibold"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              <span>{t("studio.header.share")}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
