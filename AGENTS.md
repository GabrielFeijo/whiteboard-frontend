# Agent Guidelines — Frontend

This document guides AI agents working inside the `frontend/` submodule.

## Next.js 16 & Modern Stack Context

This application runs Next.js 16 (App Router) with React 19 and Tailwind CSS 4. APIs, routing conventions, and file structure follow modern Next.js 16 patterns. Always heed framework deprecation notices.

## Architecture & Directory Layout

- `src/app/`: Next.js App Router containing route handlers, pages, and layouts.
- `src/canvas/`: Custom 2D Canvas Engine.
  - `renderers/`: Element rendering logic (rectangles, ellipses, diamonds, lines, arrows, freehand strokes, sticky notes, text, images).
  - `tools/`: Tool state machines (select, hand, shape, pencil, connector, eraser).
  - `spatial-index.ts`: R-Tree index (RBush) providing logarithmic-time spatial lookups and hit testing.
  - `viewport.ts`: Camera system and transformation matrices for world-to-screen coordinate conversions.
  - `alignment-helper.ts`: Smart magnetic alignment guides and snapping.
- `src/collab/`: Distributed state and real-time synchronization.
  - `provider.ts`: WebSocket client connecting to the Collab server on port 3002.
  - `awareness.ts`: Cursor broadcast with linear interpolation (lerp at ~30Hz), user presence, and selection bounds.
  - `undo-manager.ts`: Y.UndoManager instance configured with trackedOrigins to isolate local edits from remote updates.
- `src/features/`: Functional domain features (authentication, board management, studio UI, sharing).
- `src/shared/`: Mirrored contract definitions synchronized from backend.
- `tests/`: Vitest unit tests, contract tests, and Playwright E2E tests.

## Critical Frontend Rules

### 1. Never Edit `src/shared/` Directly
- `src/shared/` is an exact replica of `backend/src/shared/`.
- Never make changes directly inside `frontend/src/shared/`.
- Update contracts in `backend/src/shared/`, then run `make sync-shared` from root.
- Validate contract consistency with `npm run sync:shared:check` or `make sync-shared-check`.

### 2. Canvas Engine Principles
- Strictly distinguish screen coordinates (viewport pixel offsets) from world coordinates (infinite canvas coordinates).
- Z-order is managed using fractional indexing strings (`fractional-indexing`) to allow insertion without re-indexing all board elements.
- Connectors link elements via `ArrowBindingSchema` targeting `elementId` and anchor positions (`top`, `bottom`, `left`, `right`).

### 3. Verification Workflow
- Unit & contract tests: `npm run test` (runs in ~1.0s with Vitest).
- Type checking: `npm run typecheck` (`tsc --noEmit`).
- Linting: `npm run lint` (`eslint`).
- Contract integrity: `npm run sync:shared:check`.
- E2E tests: `npm run test:e2e` (requires frontend dev server).
