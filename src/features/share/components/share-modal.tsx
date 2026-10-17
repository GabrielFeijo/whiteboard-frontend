"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ShareLinkTab } from "@/features/share/components/share-link-tab";
import { ShareEmailTab } from "@/features/share/components/share-email-tab";
import { BoardMembersList } from "@/features/share/components/board-members-list";
import { useI18n } from "@/i18n/context";

interface ShareModalProps {
  boardId: string;
  boardTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ boardId, boardTitle, isOpen, onClose }: ShareModalProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"link" | "email">("link");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-5 shadow-xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between border-b border-border-subtle pb-3">
          <div>
            <h2 className="text-base font-bold text-text-primary">{t("shareModal.header.title")}</h2>
            <p className="mt-0.5 text-xs text-text-muted truncate max-w-[280px]">
              {boardTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.actions.close")}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex gap-1 rounded-lg border border-border-subtle bg-surface-raised p-1">
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === "link"
                ? "bg-surface text-text-primary shadow-2xs border border-border-subtle/80"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("shareModal.tabs.byLink")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              activeTab === "email"
                ? "bg-surface text-text-primary shadow-2xs border border-border-subtle/80"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {t("shareModal.tabs.byEmail")}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
          {activeTab === "link" ? (
            <ShareLinkTab boardId={boardId} />
          ) : (
            <ShareEmailTab boardId={boardId} />
          )}

          <BoardMembersList boardId={boardId} />
        </div>

        <div className="mt-4 flex justify-end pt-3 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.actions.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
