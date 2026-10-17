import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Role } from "@/shared";
import type { CreatedShareLink, ShareLinkItem } from "../types";

export type { CreatedShareLink, ShareLinkItem };

export function useShareLinksQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.boards.shareLinks(boardId),
    queryFn: async () => {
      const response = await api.get<ShareLinkItem[]>(
        `/boards/${boardId}/links`,
      );
      return response.data;
    },
    enabled: Boolean(boardId) && enabled,
  });
}

export function useCreateShareLinkMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { role?: Role; expiresInHours?: number }) => {
      const response = await api.post<CreatedShareLink>(
        `/boards/${boardId}/links`,
        dto,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.shareLinks(boardId),
      });
    },
  });
}

export function useRevokeShareLinkMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      await api.delete(`/boards/${boardId}/links/${linkId}`);
      return linkId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.shareLinks(boardId),
      });
    },
  });
}
