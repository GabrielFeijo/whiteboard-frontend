#!/usr/bin/env node
/**
 * Gera o cliente tipado da API a partir do OpenAPI do backend.
 *   API_URL=http://localhost:3001 npm run gen:api
 * Saída: src/lib/api/schema.d.ts
 */
import { execFileSync } from "node:child_process";

const url = `${process.env.API_URL ?? "http://localhost:3001"}/v1/docs-json`;
execFileSync("npx", ["openapi-typescript", url, "-o", "src/lib/api/schema.d.ts"], {
  stdio: "inherit",
});
