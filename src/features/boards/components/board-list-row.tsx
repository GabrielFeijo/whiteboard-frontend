"use client";

import type React from "react";
import { Copy, Pencil, Square, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRoleBadgeVariant } from "@/features/boards/components/board-grid-card";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
import { Role } from "@/shared";
import type { BoardItem } from "@/server/dal/boards.dal";

interface BoardListRowProps {
  board: BoardItem;
  onOpen: (boardId: string) => void;
  onShare: (board: BoardItem) => void;
  onDuplicate: (boardId: string, e: React.MouseEvent) => void;
  onDelete: (boardId: string, e: React.MouseEvent) => void;
  onRename?: (board: BoardItem, e: React.MouseEvent) => void;
}

const ROLE_LABEL_KEYS: Record<Role, TranslationKey> = {
  [Role.OWNER]: "dashboard.roles.OWNER",
  [Role.EDITOR]: "dashboard.roles.EDITOR",
  [Role.VIEWER]: "dashboard.roles.VIEWER",
};

export function BoardListRow({
  board,
  onOpen,
  onShare,
  onDuplicate,
  onDelete,
  onRename,
}: BoardListRowProps) {
  const { t } = useI18n();

  const roleLabelKey = ROLE_LABEL_KEYS[board.role] ?? ROLE_LABEL_KEYS[Role.VIEWER];
  const roleLabel = t(roleLabelKey);

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
          <Square className="h-4 w-4" />
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

        {onRename && (board.role === Role.OWNER || board.role === Role.EDITOR) && (
          <button
            type="button"
            onClick={(e) => onRename(board, e)}
            title={t("dashboard.card.rename")}
            aria-label={t("dashboard.card.rename")}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => onDuplicate(board.id, e)}
          title={t("common.actions.duplicate")}
          aria-label={t("common.actions.duplicate")}
          className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>

        {board.role === Role.OWNER && (
          <button
            type="button"
            onClick={(e) => onDelete(board.id, e)}
            title={t("common.actions.delete")}
            aria-label={t("common.actions.delete")}
            className="rounded-md p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
