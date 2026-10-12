"use client";

import React, { useState } from "react";
import { Role } from "../shared";
import { useSnapshotsQuery, useRestoreSnapshotMutation } from "../hooks/use-snapshots";
import { getApiErrorMessage } from "../lib/api/axios-client";
import { useI18n } from "../i18n";
import { ConfirmDialog } from "./ui/alert-dialog";

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

  const handleRestore = (snapshotId: string) => {
    setRestoringSnapshotId(snapshotId);
  };

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
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {t("versionHistory.title")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          {t("versionHistory.subtitle")}
        </p>

        {(error || restoreMutation.error) && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/50 dark:text-red-400">
            {getApiErrorMessage(error || restoreMutation.error)}
          </div>
        )}

        <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {isLoading ? (
            <p className="py-6 text-center text-xs text-zinc-400">{t("versionHistory.loading")}</p>
          ) : snapshots.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500">
              {t("versionHistory.noSnapshots")}
            </p>
          ) : (
            snapshots.map((snap) => (
              <div key={snap.id} className="flex items-center justify-between py-3 px-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {t("versionHistory.versionNumber", { version: snap.version })}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {snap.reason}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {new Date(snap.createdAt).toLocaleString(t("common.dateLocale"))}
                  </p>
                </div>

                {canRestore && (
                  <button
                    onClick={() => handleRestore(snap.id)}
                    disabled={restoreMutation.isPending}
                    className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {restoreMutation.isPending ? t("versionHistory.restoring") : t("versionHistory.restore")}
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {t("common.close")}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(restoringSnapshotId)}
        onOpenChange={(open) => {
          if (!open) setRestoringSnapshotId(null);
        }}
        title={t("versionHistory.confirmRestoreTitle")}
        description={t("versionHistory.confirmRestoreDescription")}
        cancelText={t("common.cancel")}
        confirmText={t("versionHistory.confirmRestoreAction")}
        variant="primary"
        isLoading={restoreMutation.isPending}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}
