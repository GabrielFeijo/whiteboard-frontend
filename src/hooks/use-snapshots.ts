import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/axios-client";

export interface SnapshotItem {
  id: string;
  boardId: string;
  version: number;
  reason: string;
  createdAt: string;
  size?: number;
}

export function useSnapshotsQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ["snapshots", boardId],
    queryFn: async () => {
      const response = await api.get<SnapshotItem[]>(`/boards/${boardId}/snapshots`);
      return response.data;
    },
    enabled: Boolean(boardId) && enabled,
  });
}

export function useRestoreSnapshotMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const response = await api.post<{ success: boolean; version: number }>(
        `/boards/${boardId}/snapshots/${snapshotId}/restore`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });
}
