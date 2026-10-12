/**
 * Versões de contrato entre backend e frontend.
 * O backend é a fonte da verdade; o frontend recebe uma cópia via `npm run sync:shared`.
 * Qualquer mudança incompatível em schema.ts/protocol.ts exige incrementar estas versões.
 */
export const SHARED_VERSION = '0.1.0';
/** Versão do schema do Y.Doc (armazenada em `meta.schemaVersion`). */
export const SCHEMA_VERSION = 1;
/** Versão do protocolo binário de WebSocket. */
export const PROTOCOL_VERSION = 1;
