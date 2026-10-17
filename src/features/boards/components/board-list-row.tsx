"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRoleBadgeVariant } from "@/features/boards/components/board-grid-card";
import { useI18n } from "@/i18n/context";
import type { BoardItem } from "@/server/dal/boards.dal";

interface BoardListRowProps {
  board: BoardItem;
  onOpen: (boardId: string) => void;
  onShare: (board: BoardItem) => void;
  onDuplicate: (boardId: string, e: React.MouseEvent) => void;
  onDelete: (boardId: string, e: React.MouseEvent) => void;
}

export function BoardListRow({
  board,
  onOpen,
  onShare,
  onDuplicate,
  onDelete,
}: BoardListRowProps) {
  const { t } = useI18n();

  const roleLabel =
    board.role === "OWNER"
      ? t("dashboard.roles.OWNER")
      : board.role === "EDITOR"
        ? t("dashboard.roles.EDITOR")
        : t("dashboard.roles.VIEWER");

  const formattedDate = new Date(board.updatedAt).toLocaleDateString(
    t("common.app.dateLocale")
  );

  return (
    <div
      onClick={() => onOpen(board.id)}
      className="group flex cursor-pointer items-center justify-between p-3.5 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-strong bg-canvas text-text-muted">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
            {board.title}
          </h3>
          <p className="text-[11px] text-text-muted">
            {t("dashboard.card.updatedAt", { date: formattedDate })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <Badge variant={getRoleBadgeVariant(board.role)}>{roleLabel}</Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShare(board)}
          className="text-xs"
        >
          {t("dashboard.card.share")}
        </Button>

        <button
          type="button"
          onClick={(e) => onDuplicate(board.id, e)}
          title={t("common.actions.duplicate")}
          aria-label={t("common.actions.duplicate")}
          className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>

        {board.role === "OWNER" && (
          <button
            type="button"
            onClick={(e) => onDelete(board.id, e)}
            title={t("common.actions.delete")}
            aria-label={t("common.actions.delete")}
            className="rounded-md p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
