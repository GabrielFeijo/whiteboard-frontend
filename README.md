# Whiteboard — Frontend

Next.js (App Router) + React + Tailwind, com Canvas 2D próprio, Yjs e Zustand.

> Repositório **independente** do backend. `src/shared/` e `fixtures/protocol/` são **cópias**
> do backend (fonte da verdade) mantidas por `npm run sync:shared`.

## Requisitos
Node 22+, npm 10+. Backend rodando (`../backend`) para a API/WebSocket.

## Desenvolvimento
```bash
cp .env.example .env.local
npm ci
npm run dev            # http://localhost:3000
```

## Scripts
| Script | Função |
| --- | --- |
| `npm run lint` / `typecheck` / `test` | Qualidade e testes unitários + contrato |
| `npm run build` | Build de produção (`output: standalone`) |
| `npm run sync:shared` | Copia `shared/` e fixtures do backend (`BACKEND_DIR`, padrão `../backend`) |
| `npm run sync:shared:check` | Falha se houver drift em relação ao backend (usado no CI) |
| `npm run gen:api` | Gera o cliente tipado a partir do OpenAPI (`API_URL`, padrão `http://localhost:3001`) |
| `npm run test:e2e` | Playwright (a partir do Épico 10) |

## Docker
```bash
docker build -f docker/Dockerfile -t wb-web \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  --build-arg NEXT_PUBLIC_WS_URL=ws://localhost:3002 .
```
`GET /api/health` é usado como healthcheck.
