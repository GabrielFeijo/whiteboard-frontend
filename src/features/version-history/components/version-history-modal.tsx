"use client";

import { useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import { Role } from "@/shared";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { toast } from "@/components/ui/toast";
import {
  useCreateSnapshotMutation,
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
  const createSnapshotMutation = useCreateSnapshotMutation(boardId);

  const canRestore = userRole === Role.OWNER || userRole === Role.EDITOR;
  const [restoringSnapshotId, setRestoringSnapshotId] = useState<string | null>(null);

  const handleCreateManualSnapshot = async () => {
    try {
      await createSnapshotMutation.mutateAsync();
      toast.success(t("common.toasts.snapshotCreated"));
    } catch {
      toast.error(t("common.toasts.snapshotCreateError"));
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoringSnapshotId) return;
    try {
      await restoreMutation.mutateAsync(restoringSnapshotId);
      toast.success(t("common.toasts.versionRestored"));
      setRestoringSnapshotId(null);
      if (onRestored) {
        onRestored();
      } else {
        onClose();
      }
    } catch {
      toast.error(t("common.toasts.versionRestoreError"));
    }
  };

  return (
    <ModalOverlay
      onClose={() => {
        if (!restoringSnapshotId) {
          onClose();
        }
      }}
      ariaLabel={t("versionHistory.header.title")}
      contentClassName="w-full max-w-lg rounded-2xl border border-border-strong bg-surface p-6 shadow-2xl max-h-[85vh] flex flex-col"
    >
      <div className="flex items-center justify-between pb-3.5 border-b border-border-subtle gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-text-primary leading-tight">
            {t("versionHistory.header.title")}
          </h2>
          <p className="mt-0.5 text-xs text-text-muted truncate">{t("versionHistory.header.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canRestore && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateManualSnapshot}
              disabled={createSnapshotMutation.isPending}
              className="gap-1.5 shrink-0 whitespace-nowrap shadow-2xs"
            >
              <BookmarkPlus className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
              <span className="whitespace-nowrap">
                {createSnapshotMutation.isPending
                  ? t("versionHistory.actions.creatingManual")
                  : t("versionHistory.actions.createManual")}
              </span>
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.actions.close")}
            className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-600 dark:text-red-400">
          {getApiErrorMessage(
            error,
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
    </ModalOverlay>
  );
}
