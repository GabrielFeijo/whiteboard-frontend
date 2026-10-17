export const queryKeys = {
  session: {
    all: ["session"] as const,
    currentUser: () => [...queryKeys.session.all, "me"] as const,
  },
  boards: {
    all: ["boards"] as const,
    list: (params: { cursor?: string; limit?: number; userId?: string }) =>
      [...queryKeys.boards.all, "list", params] as const,
    detail: (boardId: string, token?: string, userId?: string) =>
      ["board", boardId, token, userId] as const,
    members: (boardId: string) => ["board-members", boardId] as const,
    shareLinks: (boardId: string) => ["share-links", boardId] as const,
    snapshots: (boardId: string) => ["snapshots", boardId] as const,
  },
} as const;
