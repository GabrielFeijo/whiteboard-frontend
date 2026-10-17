"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/shared";
import { SyncProvider, type SyncStatus } from "@/collab/sync-provider";
import { getUserColor } from "@/features/studio/utils/user-color";
import { useI18n } from "@/i18n/context";
import type { SessionUser } from "@/features/auth/types";

interface UseBoardCollabOptions {
  boardId: string;
  boardRole?: Role;
  user: SessionUser | null;
  linkToken?: string;
}

interface UseBoardCollabReturn {
  provider: SyncProvider | null;
  syncStatus: SyncStatus;
  userId: string;
  userName: string;
  localColor: string;
}

export function useBoardCollab({
  boardId,
  boardRole,
  user,
  linkToken,
}: UseBoardCollabOptions): UseBoardCollabReturn {
  const { t } = useI18n();
  const [provider, setProvider] = useState<SyncProvider | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");

  const userId = user?.id || "guest";
  const userName =
    user?.name || (user?.email ? user.email.split("@")[0] : t("studio.collaborators.guestUser"));
  const userEmail = user?.email;
  const localColor = getUserColor(user?.id);

  useEffect(() => {
    if (!boardId) return;

    const sync = new SyncProvider(boardId, linkToken);
    const unsubStatus = sync.onStatusChange((status) => {
      setSyncStatus(status);
    });

    queueMicrotask(() => {
      setProvider(sync);
    });

    return () => {
      unsubStatus();
      sync.destroy();
      setProvider(null);
    };
  }, [boardId, linkToken]);

  useEffect(() => {
    if (!provider || !boardRole) return;

    provider.awareness.setLocalStateField("user", {
      id: userId,
      name: userName,
      email: userEmail,
      color: localColor,
      role: boardRole,
    });
  }, [provider, boardRole, userId, userName, userEmail, localColor]);

  return {
    provider,
    syncStatus,
    userId,
    userName,
    localColor,
  };
}
