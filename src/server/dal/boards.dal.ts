import { z } from "zod";
import { ROLES } from "@/shared";
import { serverBackendFetch } from "@/server/http/backend-client";

export const BoardItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  ownerId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  role: z.enum(ROLES),
  memberCount: z.number(),
});

export type BoardItem = z.infer<typeof BoardItemSchema>;

export const BoardsListResponseSchema = z.object({
  items: z.array(BoardItemSchema),
  nextCursor: z.string().nullable(),
});

export type BoardsListResponse = z.infer<typeof BoardsListResponseSchema>;

export const BoardDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  role: z.enum(ROLES),
  ownerId: z.string(),
});

export type BoardDetail = z.infer<typeof BoardDetailSchema>;

export async function getBoardsServer(
  cursor?: string,
  limit = 20,
): Promise<BoardsListResponse | null> {
  const search = new URLSearchParams();
  if (cursor) search.set("cursor", cursor);
  search.set("limit", String(limit));

  const res = await serverBackendFetch<BoardsListResponse>(
    `/boards?${search.toString()}`,
    {
      method: "GET",
      schema: BoardsListResponseSchema,
    },
  );

  return res.ok ? res.data : null;
}

export async function getBoardDetailServer(
  boardId: string,
  shareToken?: string,
): Promise<{ ok: true; data: BoardDetail } | { ok: false; status: number; error: string }> {
  const query = shareToken ? `?token=${encodeURIComponent(shareToken)}` : "";
  const res = await serverBackendFetch<BoardDetail>(`/boards/${encodeURIComponent(boardId)}${query}`, {
    method: "GET",
    schema: BoardDetailSchema,
  });

  if (!res.ok) {
    return { ok: false, status: res.status, error: res.error };
  }

  return { ok: true, data: res.data };
}
