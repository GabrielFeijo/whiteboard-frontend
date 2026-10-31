export const MSG = {
  SYNC: 0,
  AWARENESS: 1,
  AUTH: 2,
  CONTROL: 3,
} as const;
export type MessageType = (typeof MSG)[keyof typeof MSG];

export const WS_CLOSE = {
  NORMAL: 1000,
  RESTART: 1012,
  FORBIDDEN: 4403,
  RATE_LIMITED: 4429,
  UNAUTHORIZED: 4401,
} as const;

export const LIMITS = {
  MAX_ELEMENTS: 5000,
  MAX_PARTICIPANTS_PER_BOARD: 25,
  MAX_CONNECTIONS_PER_USER: 5,
  MAX_MESSAGE_BYTES: 1024 * 1024,
  WS_TICKET_TTL_SECONDS: 30,
  PING_INTERVAL_MS: 25_000,
  PRESENCE_TIMEOUT_MS: 30_000,
} as const;

export const Role = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = [Role.OWNER, Role.EDITOR, Role.VIEWER] as const;

export const RedisAclEventType = {
  REVOKE_LINK: 'REVOKE_LINK',
  REMOVE_MEMBER: 'REMOVE_MEMBER',
} as const;
export type RedisAclEventType = (typeof RedisAclEventType)[keyof typeof RedisAclEventType];

export const SnapshotReason = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL',
  INITIAL_SEED: 'INITIAL_SEED',
  PRE_RESTORE: 'PRE_RESTORE',
} as const;
export type SnapshotReason = (typeof SnapshotReason)[keyof typeof SnapshotReason] | string;

export const redisChannels = {
  updates: (boardId: string) => `board:${boardId}:updates`,
  restore: (boardId: string) => `board:${boardId}:restore`,
  acl: (boardId: string) => `board:${boardId}:acl`,
} as const;
