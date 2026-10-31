"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { toast } from "@/components/ui/toast";
import { useUpdateBoardMutation } from "@/features/boards/api/boards.queries";
import { useI18n } from "@/i18n/context";
import type { BoardItem } from "../types";

interface RenameBoardModalProps {
  isOpen: boolean;
  board: BoardItem | null;
  onClose: () => void;
}

export function RenameBoardModal({
  isOpen,
  board,
  onClose,
}: RenameBoardModalProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState(board?.title ?? "");
  const updateMutation = useUpdateBoardMutation(board?.id ?? "");

  if (!isOpen || !board) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    if (trimmed === board.title) {
      onClose();
      return;
    }

    try {
      await updateMutation.mutateAsync({ title: trimmed });
      toast.success(t("common.toasts.boardRenamed"));
      onClose();
    } catch {
      toast.error(t("common.toasts.boardRenameError"));
    }
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t("studio.header.rename")}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text-primary leading-tight">
            {t("studio.header.rename")}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted truncate">
            {t("studio.header.renamePrompt")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.actions.close")}
          className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          id="rename-board-input"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={board.title}
          maxLength={64}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            {t("common.actions.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={updateMutation.isPending}
            disabled={!title.trim() || title.trim() === board.title}
          >
            {t("common.actions.save")}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
