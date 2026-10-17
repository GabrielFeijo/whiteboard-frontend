"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/context";
import type { BoardItem } from "@/server/dal/boards.dal";

interface BoardGridCardProps {
  board: BoardItem;
  onOpen: (boardId: string) => void;
  onShare: (board: BoardItem) => void;
  onDuplicate: (boardId: string, e: React.MouseEvent) => void;
  onDelete: (boardId: string, e: React.MouseEvent) => void;
}

export function getRoleBadgeVariant(role: BoardItem["role"]): "default" | "success" | "neutral" {
  switch (role) {
    case "OWNER":
      return "default";
    case "EDITOR":
      return "success";
    case "VIEWER":
    default:
      return "neutral";
  }
}

export function BoardGridCard({
  board,
  onOpen,
  onShare,
  onDuplicate,
  onDelete,
}: BoardGridCardProps) {
  const { t } = useI18n();

  const roleLabel =
    board.role === "OWNER"
      ? t("dashboard.roles.OWNER")
      : board.role === "EDITOR"
        ? t("dashboard.roles.EDITOR")
        : t("dashboard.roles.VIEWER");

  return (
    <div
      onClick={() => onOpen(board.id)}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-border-subtle bg-surface p-4 shadow-xs transition-all duration-150 hover:border-accent-primary/60 hover:shadow-md active:scale-[0.99]"
    >
      <div>
        <div className="relative mb-3 h-28 w-full overflow-hidden rounded-lg border border-border-subtle bg-canvas flex items-center justify-center">
          <div
            className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              color: "var(--color-text-muted)",
            }}
          />
          <div className="flex items-center gap-2 opacity-50 transition-transform group-hover:scale-105">
            <div className="h-8 w-12 rounded border border-border-strong bg-surface" />
            <span className="text-[10px] text-text-muted">➔</span>
            <div className="h-8 w-8 rounded-full border border-border-strong bg-accent-subtle" />
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors truncate">
            {board.title}
          </h3>
          <Badge variant={getRoleBadgeVariant(board.role)}>{roleLabel}</Badge>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3 text-xs text-text-muted">
        <span>{new Date(board.updatedAt).toLocaleDateString(t("common.app.dateLocale"))}</span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onShare(board)}
            title={t("dashboard.card.share")}
            aria-label={t("dashboard.card.share")}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
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
          </button>

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
    </div>
  );
}
