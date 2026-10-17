"use client";

import { SyncStatus } from "@/collab/sync-provider";
import { useI18n } from "@/i18n/context";
import type { TranslationKey } from "@/i18n/types";

interface ConnectionStatusBadgeProps {
  status: SyncStatus;
}

const STATUS_CONFIG: Record<
  SyncStatus,
  { color: string; labelKey: TranslationKey }
> = {
  [SyncStatus.SYNCED]: {
    color: "bg-emerald-500",
    labelKey: "studio.connection.states.connected",
  },
  [SyncStatus.CONNECTED]: {
    color: "bg-emerald-500",
    labelKey: "studio.connection.states.connected",
  },
  [SyncStatus.SYNCING]: {
    color: "bg-amber-500 animate-pulse",
    labelKey: "studio.connection.states.syncing",
  },
  [SyncStatus.CONNECTING]: {
    color: "bg-amber-500 animate-pulse",
    labelKey: "studio.connection.states.connecting",
  },
  [SyncStatus.OFFLINE]: {
    color: "bg-red-500",
    labelKey: "studio.connection.states.offline",
  },
  [SyncStatus.FORBIDDEN]: {
    color: "bg-zinc-400",
    labelKey: "studio.connection.states.offline",
  },
};

export function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const { t } = useI18n();
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[SyncStatus.CONNECTING];
  const statusLabel = t(config.labelKey);

  return (
    <span
      className={`h-2 w-2 rounded-full transition-colors ${config.color}`}
      title={t("studio.connection.tooltip", { status: statusLabel })}
    />
  );
}
