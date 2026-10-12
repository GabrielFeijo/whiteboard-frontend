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

export const ROLES = ['OWNER', 'EDITOR', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export const redisChannels = {
  updates: (boardId: string) => `board:${boardId}:updates`,
  acl: (boardId: string) => `board:${boardId}:acl`,
};
