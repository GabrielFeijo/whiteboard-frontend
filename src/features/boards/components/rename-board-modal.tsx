"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [prevBoardId, setPrevBoardId] = useState(board?.id);

  if (board && board.id !== prevBoardId) {
    setPrevBoardId(board.id);
    setTitle(board.title);
  }

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {t("studio.header.rename")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {t("studio.header.renamePrompt")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.actions.close")}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
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
      </div>
    </div>
  );
}
