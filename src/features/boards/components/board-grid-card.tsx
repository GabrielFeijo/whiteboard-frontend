"use client";

import type React from "react";
import { ArrowRight, Copy, Pencil, Share2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
import { Role } from "@/shared";
import type { BoardItem } from "../types";

interface BoardGridCardProps {
  board: BoardItem;
  onOpen: (boardId: string) => void;
  onShare: (board: BoardItem) => void;
  onDuplicate: (boardId: string, e: React.MouseEvent) => void;
  onDelete: (boardId: string, e: React.MouseEvent) => void;
  onRename?: (board: BoardItem, e: React.MouseEvent) => void;
}

const ROLE_BADGE_VARIANTS: Record<Role, "default" | "success" | "neutral"> = {
  [Role.OWNER]: "default",
  [Role.EDITOR]: "success",
  [Role.VIEWER]: "neutral",
};

const ROLE_LABEL_KEYS: Record<Role, TranslationKey> = {
  [Role.OWNER]: "dashboard.roles.OWNER",
  [Role.EDITOR]: "dashboard.roles.EDITOR",
  [Role.VIEWER]: "dashboard.roles.VIEWER",
};

export function getRoleBadgeVariant(role: BoardItem["role"]): "default" | "success" | "neutral" {
  return ROLE_BADGE_VARIANTS[role] ?? "neutral";
}

export function BoardGridCard({
  board,
  onOpen,
  onShare,
  onDuplicate,
  onDelete,
  onRename,
}: BoardGridCardProps) {
  const { t } = useI18n();

  const roleLabelKey = ROLE_LABEL_KEYS[board.role] ?? ROLE_LABEL_KEYS[Role.VIEWER];
  const roleLabel = t(roleLabelKey);

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

        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm text-text-primary truncate group-hover:text-accent-primary transition-colors">
            {board.title}
          </h3>
          <Badge variant={getRoleBadgeVariant(board.role)}>
            {roleLabel}
          </Badge>
        </div>

        <p className="mt-1 text-xs text-text-muted">
          {t("dashboard.card.updatedAt", {
            date: new Date(board.updatedAt).toLocaleDateString(),
          })}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-accent-primary flex items-center gap-1 group-hover:underline">
          {t("dashboard.card.open")}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onShare(board)}
            title={t("dashboard.card.share")}
            aria-label={t("dashboard.card.share")}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>

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
    </div>
  );
}
