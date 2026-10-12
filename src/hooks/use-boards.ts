import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/axios-client";
import { Role } from "../shared";

export interface BoardItem {
  id: string;
  title: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
  memberCount: number;
}

export interface BoardDetail {
  id: string;
  title: string;
  role: Role;
  ownerId: string;
}

export function useBoardsQuery(cursor?: string, limit = 20) {
  return useQuery({
    queryKey: ["boards", { cursor, limit }],
    queryFn: async () => {
      const response = await api.get<{ items: BoardItem[]; nextCursor: string | null }>("/boards", {
        params: { cursor, limit },
      });
      return response.data;
    },
  });
}

export function useBoardQuery(boardId: string, token?: string, enabled = true) {
  return useQuery({
    queryKey: ["board", boardId, token],
    queryFn: async () => {
      const response = await api.get<BoardDetail>(`/boards/${boardId}`, {
        params: token ? { token } : undefined,
      });
      return response.data;
    },
    enabled: Boolean(boardId) && enabled,
  });
}

export function useCreateBoardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { title: string }) => {
      const response = await api.post<BoardItem>("/boards", dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

export function useUpdateBoardMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { title: string }) => {
      const response = await api.patch<BoardItem>(`/boards/${boardId}`, dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });
}

export function useDeleteBoardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (boardId: string) => {
      await api.delete(`/boards/${boardId}`);
      return boardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}

export function useDuplicateBoardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (boardId: string) => {
      const response = await api.post<BoardItem>(`/boards/${boardId}/duplicate`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
  });
}
