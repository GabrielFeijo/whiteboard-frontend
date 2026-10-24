import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";

import type { RestoreSnapshotResponse, SnapshotItem } from "../types";

export type { RestoreSnapshotResponse, SnapshotItem };

export function useSnapshotsQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.boards.snapshots(boardId),
    queryFn: async () => {
      const response = await apiClient.get<SnapshotItem[]>(`/boards/${boardId}/snapshots`);
      return response.data;
    },
    enabled: Boolean(boardId) && enabled,
  });
}

export function useRestoreSnapshotMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const response = await apiClient.post<{ success: boolean; version: number }>(
        `/boards/${boardId}/snapshots/${snapshotId}/restore`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.snapshots(boardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

export function useCreateSnapshotMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SnapshotItem>(
        `/boards/${boardId}/snapshots`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.snapshots(boardId) });
    },
  });
}
