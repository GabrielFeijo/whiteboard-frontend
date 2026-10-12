import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api/axios-client";
import { useAuthStore } from "../store/auth-store";
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

export interface BoardMemberInfo {
  boardId: string;
  userId: string;
  role: Role;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export function useBoardsQuery(cursor?: string, limit = 20) {
  const userId = useAuthStore((s) => s.user?.id);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  return useQuery({
    queryKey: ["boards", { cursor, limit }, userId],
    queryFn: async () => {
      const response = await api.get<{ items: BoardItem[]; nextCursor: string | null }>("/boards", {
        params: { cursor, limit },
      });
      return response.data;
    },
    enabled: isInitialized && Boolean(userId),
  });
}

export function useBoardQuery(boardId: string, token?: string, enabled = true) {
  const userId = useAuthStore((s) => s.user?.id);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["board", boardId, token, userId],
    queryFn: async () => {
      const response = await api.get<BoardDetail>(`/boards/${boardId}`, {
        params: token ? { token } : undefined,
      });
      if (token && userId) {
        queryClient.invalidateQueries({ queryKey: ["boards"] });
      }
      return response.data;
    },
    enabled: Boolean(boardId) && isInitialized && enabled,
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

export function useBoardMembersQuery(boardId: string, enabled = true) {
  return useQuery({
    queryKey: ["board-members", boardId],
    queryFn: async () => {
      const response = await api.get<BoardMemberInfo[]>(`/boards/${boardId}/members`);
      return response.data;
    },
    enabled: Boolean(boardId) && enabled,
  });
}

export function useAddBoardMemberMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { email: string; role: Role }) => {
      const response = await api.post<BoardMemberInfo>(`/boards/${boardId}/members`, dto);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });
}

export function useRemoveBoardMemberMutation(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberUserId: string) => {
      await api.delete(`/boards/${boardId}/members/${memberUserId}`);
      return memberUserId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });
}
