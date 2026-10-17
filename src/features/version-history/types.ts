export interface SnapshotItem {
  id: string;
  boardId: string;
  version: number;
  reason: string;
  createdAt: string;
  size?: number;
}

export interface RestoreSnapshotResponse {
  success: boolean;
  version: number;
}
