"use client";

import { useEffect, useState } from "react";
import type { CanvasEngine } from "@/canvas/canvas-engine";
import type { SyncProvider } from "@/collab/sync-provider";

export function useFollowCollaborator(
  provider: SyncProvider | null,
  engine: CanvasEngine | null
) {
  const [followingClientId, setFollowingClientId] = useState<number | null>(null);

  useEffect(() => {
    if (!provider || !engine || followingClientId === null) return;

    const onAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const targetState = states.get(followingClientId);
      if (targetState && targetState.viewport) {
        engine.setViewport(targetState.viewport.pan, targetState.viewport.zoom);
      }
    };

    provider.awareness.on("change", onAwarenessChange);
    onAwarenessChange();

    return () => {
      provider.awareness.off("change", onAwarenessChange);
    };
  }, [provider, engine, followingClientId]);

  return {
    followingClientId,
    setFollowingClientId,
  };
}
