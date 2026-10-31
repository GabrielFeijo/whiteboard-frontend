"use client";

import type React from "react";
import { Copy, Pencil, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";
import { Role } from "@/shared";
import type { BoardItem } from "../types";

export interface BoardActionProps {
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

export function getRoleBadgeVariant(
  role: BoardItem["role"],
): "default" | "success" | "neutral" {
  return ROLE_BADGE_VARIANTS[role] ?? "neutral";
}

export function getRoleLabelKey(role: BoardItem["role"]): TranslationKey {
  return ROLE_LABEL_KEYS[role] ?? ROLE_LABEL_KEYS[Role.VIEWER];
}

interface BoardCardActionsProps {
  board: BoardItem;
  variant?: "icon-only" | "text-share";
  onShare: (board: BoardItem) => void;
  onDuplicate: (boardId: string, e: React.MouseEvent) => void;
  onDelete: (boardId: string, e: React.MouseEvent) => void;
  onRename?: (board: BoardItem, e: React.MouseEvent) => void;
}

export function BoardCardActions({
  board,
  variant = "icon-only",
  onShare,
  onDuplicate,
  onDelete,
  onRename,
}: BoardCardActionsProps) {
  const { t } = useI18n();
  const canRename =
    Boolean(onRename) &&
    (board.role === Role.OWNER || board.role === Role.EDITOR);

  return (
    <div
      className={
        variant === "text-share"
          ? "flex items-center gap-2"
          : "flex items-center gap-1"
      }
      onClick={(e) => e.stopPropagation()}
    >
      {board.role === Role.OWNER &&
        (variant === "text-share" ? (
          <>
            <span className="hidden sm:inline-flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onShare(board)}
                className="text-xs"
              >
                {t("dashboard.card.share")}
              </Button>
            </span>
            <button
              type="button"
              onClick={() => onShare(board)}
              title={t("dashboard.card.share")}
              aria-label={t("dashboard.card.share")}
              className="sm:hidden rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onShare(board)}
            title={t("dashboard.card.share")}
            aria-label={t("dashboard.card.share")}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        ))}

      {canRename && onRename && (
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
  );
}
