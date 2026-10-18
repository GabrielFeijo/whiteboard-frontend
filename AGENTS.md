<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Guia de Desenvolvimento Agêntico — Frontend (Next.js 16 + Canvas 2D)

Este documento orienta agentes de IA trabalhando no repositório `frontend/`.

---

## 🎨 Arquitetura e Estrutura de Pastas

O frontend é uma aplicação **Next.js 16 (App Router)** com **React 19**, **Tailwind CSS 4** e uma **engine de canvas 2D proprietária** integrada a **CRDT (Yjs)**:

```text
frontend/
├── src/
│   ├── app/                  # Next.js App Router (páginas, layouts e rotas de API pública)
│   ├── canvas/               # Engine de Canvas 2D Proprietária
│   │   ├── renderers/        # Renderização de formas (rect, ellipse, diamond, arrow, freehand, sticky, text)
│   │   ├── tools/            # Máquinas de estado de ferramentas (select, hand, shape, pencil, connector, eraser)
│   │   ├── spatial-index.ts  # R-Tree (RBush) para indexação espacial e hit testing em O(log n)
│   │   ├── viewport.ts       # Sistema de câmera, transformações de matriz de coordenadas mundo <-> tela
│   │   └── alignment-helper  # Guias de alinhamento magnético inteligente
│   ├── collab/               # Sincronização em Tempo Real e Estado Distribuído
│   │   ├── provider.ts       # Provedor WebSocket para o Collab Server
│   │   ├── awareness.ts      # Cursores remotos com interpolação linear (lerp ~30Hz), presença e seleções
│   │   └── undo-manager.ts   # Y.UndoManager com trackedOrigins e isolamento de ações locais
│   ├── features/             # Módulos funcionais de negócio (auth, boards, studio, share)
│   ├── shared/               # CÓPIA SINCRONIZADA dos contratos do backend (NÃO EDITAR DIRETAMENTE!)
│   └── i18n/                 # Dicionários pt-BR e en-US com alternância dinâmica
├── tests/
│   ├── unit/                 # Testes unitários de renderers, matemática de canvas, ferramentas e stores
│   ├── contract/             # Validação do contrato shared contra fixtures binárias
│   └── e2e/                  # Testes ponta a ponta Playwright multiusuário
└── scripts/
    ├── sync-shared.mjs       # Script de sincronização de shared/ a partir do backend
    └── gen-api.mjs           # Gerador de cliente TypeScript a partir do OpenAPI da API REST
```

---

## ⚡ Regras Críticas para o Frontend

### 1. Nunca edite `src/shared/` diretamente!
- O diretório `src/shared/` é um espelho de `backend/src/shared/` gerado por automação.
- Qualquer alteração manual aqui será sobrescrita e detectada como drift.
- Para alterar contratos ou schemas:
  1. Altere no backend (`backend/src/shared/`).
  2. Execute `npm run sync:shared`.
  3. Valide com `npm run sync:shared:check`.

### 2. Padrões da Engine de Canvas 2D
- **Sistemas de Coordenadas:** Distinga sempre **coordenadas de tela** (pixels do viewport) de **coordenadas de mundo** (posições reais dos elementos no quadro infinito).
- **Z-Order:** A profundidade z dos elementos utiliza *fractional indexing* (`fractional-indexing`) para permitir reordenação determinística sem reindexar todos os elementos.
- **Conexões e Âncoras:** Setas e conectores utilizam `ArrowBindingSchema` referenciando o `elementId` e a âncora (`top`, `bottom`, `left`, `right`).

### 3. Presença e Awareness
- O estado de presença do usuário (`PresenceState`) inclui cursor em coordenadas de mundo, seleção atual e viewport.
- Atualizações de cursor devem ser throttled para não sobrecarregar o canal de WebSocket.

### 4. Ciclo de Testes
- **Testes Unitários:** `npm run test` (Vitest, roda em ~1.0s).
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`).
- **Linting:** `npm run lint` (`eslint`).
- **Integridade do Shared:** `npm run sync:shared:check`.
- **E2E Playwright:** `npm run test:e2e` (requer servidor frontend rodando).
