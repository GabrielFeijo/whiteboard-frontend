# Claude Code Guidelines — Frontend Submodule

This submodule contains the Next.js 16 (App Router) + React 19 visual studio and custom 2D Canvas Engine on port 3000.

See [`AGENTS.md`](./AGENTS.md) for full architecture details, coordinate math, tool strategies, and invariants.

## Quick Commands

- **Run Tests**: `npm run test` (Vitest unit and contract tests).
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`).
- **Lint**: `npm run lint` (`eslint`).
- **Contract Check**: `npm run sync:shared:check`.
- **E2E Tests**: `npm run test:e2e` (Playwright).

## Essential Invariants

1. **NEVER** edit files inside `src/shared/` directly. Contracts originate in `backend/src/shared/`.
2. Strictly separate Screen Coordinates from World Coordinates via `viewport.screenToWorld()` and `viewport.worldToScreen()`.
3. Keep `SpatialIndex` (RBush R-Tree) in sync with all element additions, modifications, and removals.
4. Always pass `origin: store.localOrigin` to local mutations to preserve clean Undo/Redo boundaries.
5. Always commit using Conventional Commits (`feat(...)`, `fix(...)`, etc.).
