"use client";

import type { SyncStatus } from "@/collab/sync-provider";
import { useI18n } from "@/i18n/context";

interface ConnectionStatusBadgeProps {
  status: SyncStatus;
}

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const { t } = useI18n();

  const statusColor =
    status === "synced"
      ? "bg-emerald-500"
      : status === "syncing" || status === "connecting"
        ? "bg-amber-500 animate-pulse"
        : status === "offline"
          ? "bg-red-500"
          : "bg-zinc-400";

  const statusLabel =
    status === "synced"
      ? t("studio.connection.states.connected")
      : status === "syncing"
        ? t("studio.connection.states.syncing")
        : status === "offline"
          ? t("studio.connection.states.offline")
          : t("studio.connection.states.connecting");

  return (
    <span
      className={`h-2 w-2 rounded-full transition-colors ${statusColor}`}
      title={t("studio.connection.tooltip", { status: statusLabel })}
    />
  );
}
