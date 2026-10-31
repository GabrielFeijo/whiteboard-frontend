"use client";

import { Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BoardCardActions,
  getRoleBadgeVariant,
  getRoleLabelKey,
  type BoardActionProps,
} from "@/features/boards/components/board-card-actions";
import { useI18n } from "@/i18n/context";

export function BoardListRow({
  board,
  onOpen,
  onShare,
  onDuplicate,
  onDelete,
  onRename,
}: BoardActionProps) {
  const { t } = useI18n();
  const roleLabel = t(getRoleLabelKey(board.role));
  const formattedDate = new Date(board.updatedAt).toLocaleDateString(
    t("common.app.dateLocale"),
  );

  return (
    <div
      onClick={() => onOpen(board.id)}
      className="group flex cursor-pointer items-center justify-between gap-2 sm:gap-3 p-3 sm:p-3.5 hover:bg-surface-hover transition-colors"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-canvas text-text-muted">
          <Square className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
              {board.title}
            </h3>
            <span className="sm:hidden shrink-0 inline-flex">
              <Badge
                variant={getRoleBadgeVariant(board.role)}
                className="text-[9px] px-1.5 py-0"
              >
                {roleLabel}
              </Badge>
            </span>
          </div>
          <p className="text-[11px] text-text-muted truncate">
            {t("dashboard.card.updatedAt", { date: formattedDate })}
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 sm:gap-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hidden sm:inline-flex">
          <Badge variant={getRoleBadgeVariant(board.role)}>{roleLabel}</Badge>
        </span>

        <BoardCardActions
          board={board}
          variant="text-share"
          onShare={onShare}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onRename={onRename}
        />
      </div>
    </div>
  );
}
