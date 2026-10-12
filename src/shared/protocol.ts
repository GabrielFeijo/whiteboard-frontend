/** Tipos de mensagem do protocolo binário (primeiro varint da mensagem). Doc §7.1. */
export const MSG = {
  SYNC: 0,
  AWARENESS: 1,
  AUTH: 2,
  CONTROL: 3,
} as const;
export type MessageType = (typeof MSG)[keyof typeof MSG];

/** Códigos de fechamento do WebSocket usados pelo Collab Server. */
export const WS_CLOSE = {
  NORMAL: 1000,
  RESTART: 1012, // pod em deploy/shutdown: cliente deve reconectar
  FORBIDDEN: 4403, // acesso revogado / sem permissão
  RATE_LIMITED: 4429,
  UNAUTHORIZED: 4401,
} as const;

/** Limites de negócio e de canal (doc §2.1 e §14.4). */
export const LIMITS = {
  MAX_ELEMENTS: 5000,
  MAX_PARTICIPANTS_PER_BOARD: 25,
  MAX_CONNECTIONS_PER_USER: 5,
  MAX_MESSAGE_BYTES: 1024 * 1024,
  WS_TICKET_TTL_SECONDS: 30,
  PING_INTERVAL_MS: 25_000,
  PRESENCE_TIMEOUT_MS: 30_000,
} as const;

/** Papéis de acesso a um quadro. */
export const ROLES = ['OWNER', 'EDITOR', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

/** Canais Redis por quadro (doc §7.4 e §14.3). */
export const redisChannels = {
  updates: (boardId: string) => `board:${boardId}:updates`,
  acl: (boardId: string) => `board:${boardId}:acl`,
};
