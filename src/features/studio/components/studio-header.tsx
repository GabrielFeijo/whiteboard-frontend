"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, History, Pencil, Share2, X } from "lucide-react";
import { Role } from "@/shared";
import { LanguageSwitcher } from "@/components/preferences/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { SyncProvider, SyncStatus } from "@/collab/sync-provider";
import { CollaboratorsList } from "@/features/studio/components/collaborators-list";
import { ConnectionStatusBadge } from "@/features/studio/components/connection-status-badge";
import { useI18n } from "@/i18n/context";

interface StudioHeaderProps {
  boardId?: string;
  boardTitle: string;
  boardRole: Role;
  syncStatus: SyncStatus;
  provider: SyncProvider | null;
  followingClientId: number | null;
  onFollowUser: (targetId: number | null) => void;
  onOpenHistory: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  onRenameBoard?: (newTitle: string) => Promise<void>;
}

export function StudioHeader({
  boardId: _boardId,
  boardTitle,
  boardRole,
  syncStatus,
  provider,
  followingClientId,
  onFollowUser,
  onOpenHistory,
  onOpenExport,
  onOpenShare,
  onRenameBoard,
}: StudioHeaderProps) {
  const { t } = useI18n();
  const router = useRouter();
  const isReadOnly = boardRole === Role.VIEWER;

  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingTitle !== null;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editingTitle === null) return;
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === boardTitle) {
      setEditingTitle(null);
      return;
    }
    try {
      if (onRenameBoard) {
        await onRenameBoard(trimmed);
      }
    } finally {
      setEditingTitle(null);
    }
  };

  const handleCancel = () => {
    setEditingTitle(null);
  };

  const canEditTitle = !isReadOnly && Boolean(onRenameBoard);

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
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="h-3.5 w-px bg-border-subtle" />

        {isEditing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              className="h-6 w-36 sm:w-48 rounded border border-accent-primary bg-surface px-1.5 text-xs font-semibold text-text-primary outline-hidden"
              maxLength={64}
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              className="rounded p-0.5 text-emerald-500 hover:bg-surface-hover"
              title={t("common.actions.save")}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded p-0.5 text-text-muted hover:bg-surface-hover"
              title={t("common.actions.cancel")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div
            className={`group flex items-center gap-1.5 ${
              canEditTitle ? "cursor-pointer" : ""
            }`}
            onClick={() => canEditTitle && setEditingTitle(boardTitle)}
            title={canEditTitle ? t("studio.header.rename") : undefined}
          >
            <h1 className="text-xs font-semibold text-text-primary max-w-36 sm:max-w-64 truncate">
              {boardTitle}
            </h1>
            {canEditTitle && (
              <Pencil className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        )}

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
            <History className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            title={t("studio.header.exportCanvas")}
            aria-label={t("studio.header.exportCanvas")}
            className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>

          {boardRole === Role.OWNER && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenShare}
              className="gap-1.5 text-xs font-semibold"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>{t("studio.header.share")}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
