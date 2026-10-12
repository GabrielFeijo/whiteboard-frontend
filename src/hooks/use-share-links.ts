import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/axios-client";
import { Role } from "../shared";

export interface ShareLinkItem {
  id: string;
  role: Role;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreatedShareLink extends ShareLinkItem {
  boardId: string;
  token: string;
}

export function useShareLinksQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ["share-links", boardId],
    queryFn: async () => {
      const response = await api.get<ShareLinkItem[]>(`/boards/${boardId}/links`);
      return response.data;
    },
    enabled: Boolean(boardId) && enabled,
  });
}

export function useCreateShareLinkMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { role?: Role; expiresInHours?: number }) => {
      const response = await api.post<CreatedShareLink>(`/boards/${boardId}/links`, dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["share-links", boardId] });
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
      queryClient.invalidateQueries({ queryKey: ["share-links", boardId] });
    },
  });
}
