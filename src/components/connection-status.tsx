"use client";

import React from "react";
import type { ConnectionStatus as ConnectionStatusType } from "../collab/sync-provider";

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

export function ConnectionBadge({ status }: ConnectionStatusProps) {
  switch (status) {
    case "synced":
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Synced</span>
        </div>
      );
    case "syncing":
    case "connecting":
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Syncing...</span>
        </div>
      );
    case "offline":
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-zinc-400" />
          <span>Offline (Saved locally)</span>
        </div>
      );
    case "forbidden":
      return (
        <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span>Access Revoked</span>
        </div>
      );
  }
}

export const ConnectionStatus = ConnectionBadge;
