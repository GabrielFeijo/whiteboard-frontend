import type { Role } from "@/shared";

export interface BoardItem {
  id: string;
  title: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
  memberCount: number;
}

export interface BoardsListResponse {
  items: BoardItem[];
  nextCursor: string | null;
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

export type BoardMember = BoardMemberInfo;
