"use client";

import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BoardCardActions,
  getRoleBadgeVariant,
  getRoleLabelKey,
  type BoardActionProps,
} from "@/features/boards/components/board-card-actions";
import { useI18n } from "@/i18n/context";

export { getRoleBadgeVariant };

export function BoardGridCard({
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
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 shadow-xs transition-all duration-150 hover:border-accent-primary/60 hover:shadow-md active:scale-[0.99]"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="h-10 w-full rounded-lg bg-surface-subtle border border-border-subtle/50 flex items-center justify-center relative overflow-hidden">
            <div
              style={{
                backgroundImage: `radial-gradient(circle, var(--color-border-strong) 1px, transparent 1px)`,
                backgroundSize: "8px 8px",
              }}
              className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
            />
            <span className="text-2xs font-mono text-text-muted select-none">
              canvas-preview
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 min-w-0">
          <h3 className="font-semibold text-sm text-text-primary truncate min-w-0 flex-1 group-hover:text-accent-primary transition-colors">
            {board.title}
          </h3>
          <Badge variant={getRoleBadgeVariant(board.role)} className="shrink-0">{roleLabel}</Badge>
        </div>

        <p className="mt-1 text-xs text-text-muted">
          {t("dashboard.card.updatedAt", { date: formattedDate })}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-accent-primary flex items-center gap-1 group-hover:underline">
          {t("dashboard.card.open")}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>

        <BoardCardActions
          board={board}
          variant="icon-only"
          onShare={onShare}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onRename={onRename}
        />
      </div>
    </div>
  );
}
