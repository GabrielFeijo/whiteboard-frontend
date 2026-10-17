"use client";

import { useState } from "react";
import type { Role } from "@/shared";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useRestoreSnapshotMutation,
  useSnapshotsQuery,
} from "@/features/version-history/api/snapshots.queries";
import { useI18n } from "@/i18n/context";
import { getApiErrorMessage } from "@/lib/api/client";

interface VersionHistoryModalProps {
  boardId: string;
  userRole: Role;
  onClose: () => void;
  onRestored?: () => void;
}

export function VersionHistoryModal({
  boardId,
  userRole,
  onClose,
  onRestored,
}: VersionHistoryModalProps) {
  const { t } = useI18n();
  const { data: snapshots = [], isLoading, error } = useSnapshotsQuery(boardId);
  const restoreMutation = useRestoreSnapshotMutation(boardId);

  const canRestore = userRole === "OWNER" || userRole === "EDITOR";
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);

  const handleConfirmRestore = async () => {
    if (!restoringSnapshotId) return;
    try {
      await restoreMutation.mutateAsync(restoringSnapshotId);
      setRestoringSnapshotId(null);
      if (onRestored) {
        onRestored();
      } else {
        window.location.reload();
      }
    } catch {
      return;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-border-strong">
        <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {t("versionHistory.header.title")}
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">{t("versionHistory.header.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.actions.close")}
            className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover"
          >
            <svg
              className="h-4 w-4"
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

        {(error || restoreMutation.error) && (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
            {getApiErrorMessage(
              error || restoreMutation.error,
              t("versionHistory.errors.restoreFailed")
            )}
          </div>
        )}

        <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-border-subtle">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-text-muted">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent mx-auto mb-2" />
              {t("versionHistory.list.loading")}
            </div>
          ) : snapshots.length === 0 ? (
            <p className="py-8 text-center text-xs text-text-muted">
              {t("versionHistory.list.empty")}
            </p>
          ) : (
            snapshots.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between py-3 px-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-primary">
                      {t("versionHistory.list.versionNumber", { version: snap.version })}
                    </span>
                    <Badge variant="neutral" className="text-[10px]">
                      {snap.reason}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {new Date(snap.createdAt).toLocaleString(t("common.app.dateLocale"))}
                  </p>
                </div>

                {canRestore && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setRestoringSnapshotId(snap.id)}
                    disabled={restoreMutation.isPending}
                  >
                    {restoreMutation.isPending
                      ? t("versionHistory.actions.restoring")
                      : t("versionHistory.actions.restore")}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex justify-end pt-3 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.actions.close")}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(restoringSnapshotId)}
        onOpenChange={(open) => {
          if (!open) setRestoringSnapshotId(null);
        }}
        title={t("versionHistory.confirmRestore.title")}
        description={t("versionHistory.confirmRestore.description")}
        cancelText={t("common.actions.cancel")}
        confirmText={t("versionHistory.confirmRestore.confirm")}
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}
