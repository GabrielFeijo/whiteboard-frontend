# Claude Code Guidelines — Frontend Submodule

This submodule contains the Next.js 16 (App Router) + React 19 visual studio and custom 2D Canvas Engine on port 3000.

See [`AGENTS.md`](./AGENTS.md) for full architecture details, coordinate math, tool strategies, code quality rules, and invariants.

## Quick Commands

- **Run Tests**: `npm run test` (Vitest unit and contract tests).
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`).
- **Lint**: `npm run lint` (`eslint`).
- **Contract Check**: `npm run sync:shared:check`.
- **E2E Tests**: `npm run test:e2e` (Playwright).

## Essential Invariants & Code Standards

1. **Contracts Authority**: **NEVER** edit files inside `src/shared/` directly. Contracts originate in `backend/src/shared/`.
2. **Coordinate Separation**: Strictly separate Screen Coordinates from World Coordinates via `viewport.screenToWorld()` and `viewport.worldToScreen()`.
3. **Spatial Index**: Keep `SpatialIndex` (RBush R-Tree) in sync with all element additions, modifications, and removals.
4. **CRDT Origins**: Always pass `origin: store.localOrigin` to local mutations to preserve clean Undo/Redo boundaries.
5. **No AI Signatures or Dead Code**: Never add comments referring to AI models or user requests. Never leave blocks of commented-out dead code.
6. **No Code Smells**: Never use `any` or `@ts-ignore`. Never trigger heavy unbatched React re-renders inside the 60 FPS animation loop.
7. **Conventional Commits**: Always commit using Conventional Commits (`feat(...)`, `fix(...)`, etc.) in lowercase imperative mood.
8. **English Language**: All documentation, code comments, and commit messages must be in English.
