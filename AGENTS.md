# Agent Guidelines — Frontend

This document guides AI agents working inside the `frontend/` submodule.

## Stack & Architecture Context

This application runs **Next.js 16 (App Router)** with **React 19**, **Tailwind CSS 4**, and a proprietary **2D Canvas Engine**. APIs, routing conventions, and file structure follow modern Next.js 16 patterns.

## Directory Layout & Core Systems

- `src/app/`: Next.js App Router containing route handlers, pages (`/`, `/boards`, `/board/[id]`, `/login`, `/register`), and layouts.
- `src/canvas/`: Custom 2D Canvas Engine.
  - `engine.ts`: Core canvas engine orchestrating the 60 FPS animation loop, dirty-flag render triggering, and layer dispatch.
  - `viewport.ts`: Camera system managing pan `{ x, y }`, zoom (`0.1x` to `5.0x`), and matrix transformations (`screenToWorld`, `worldToScreen`).
  - `spatial-index.ts`: R-Tree index (RBush) providing $O(\log N)$ spatial lookups, viewport culling, and point/box hit-testing.
  - `renderers/`: Modular element renderers:
    - Shape renderer (rectangles, ellipses, diamonds).
    - Connector & arrow renderer (straight, curved/elbow lines with start/end bindings).
    - Freehand pencil renderer (smoothed spline paths).
    - Sticky note renderer (colored notes with wrapped text).
    - Text renderer (inline editable text with font sizing).
    - Image renderer (cached bitmap rendering).
    - Grid renderer (infinite dot or line grid).
    - Overlay renderer (selection bounding box, rotation handles, resize anchors, magnetic snap guides).
  - `tools/`: Decoupled tool strategy pattern implementing pointer down, move, and up lifecycles:
    - `SelectTool`: Selection, box multi-select, drag, resize, rotate, duplicate.
    - `HandTool`: Viewport panning via mouse drag or spacebar hold.
    - `ShapeTool`: Live creation of geometric shapes.
    - `PencilTool`: Freehand vector sketching with pressure/point sampling.
    - `ConnectorTool`: Point-to-point and magnetic anchor-to-anchor arrows.
    - `StickyTool`: One-click sticky note placement.
    - `TextTool`: Click-to-type canvas text nodes.
    - `EraserTool`: Drag-to-delete elements.
  - `alignment-helper.ts`: Smart magnetic alignment guides and distance snapping.
- `src/collab/`: Distributed state and real-time synchronization.
  - `provider.ts`: WebSocket client connecting to the Collab server on port 3002 using ticket-based authentication.
  - `awareness.ts`: User presence broadcast with linear interpolation (lerp at ~30Hz), remote cursor coordinates, and selection bounds.
  - `undo-manager.ts`: `Y.UndoManager` configured with `trackedOrigins` isolating local user edits from remote peer updates.
- `src/features/`: Functional domain modules:
  - `auth/`: Authentication state, login/register forms, cookie management.
  - `boards/`: Board gallery, creation modal, sharing dialog, and RBAC role checks.
  - `studio/`: Canvas top toolbar, bottom toolbar, zoom controls, export modal, and minimap.
- `src/shared/`: Mirrored contract definitions synchronized from backend.
- `tests/`: Vitest unit tests, contract tests, and Playwright E2E tests.

---

## Critical Frontend Invariants & Mathematical Rules

### 1. Coordinate Systems (Screen vs World)
- **Screen Coordinates**: Raw pixels relative to the HTML `<canvas>` element (e.g. `event.clientX - rect.left`).
- **World Coordinates**: The infinite 2D space where elements live, independent of camera zoom or pan.
- **Rule**: Never mix screen and world coordinates. Always convert inputs using:
  ```ts
  const worldPoint = viewport.screenToWorld(screenX, screenY);
  const screenPoint = viewport.worldToScreen(worldX, worldY);
  ```

### 2. Spatial Index Synchronization
- `SpatialIndex` (RBush) accelerates rendering by omitting elements outside the visible viewport.
- **Rule**: Whenever an element is created, moved, resized, or deleted, its bounding box in `SpatialIndex` MUST be updated synchronously.

### 3. Z-Index and Fractional Indexing
- Elements use fractional indexing strings (via `fractional-indexing`) for the `z` property (e.g. `'a0100'`, `'a0101'`).
- **Rule**: Never sort elements using array indices or mutate IDs for ordering. To move an element forward or backward, generate a fractional index between its adjacent neighbors.

### 4. Undo/Redo Origin Isolation
- `Y.UndoManager` tracks changes to the `elements` Y.Map.
- **Rule**: All local user actions must specify `origin: store.localOrigin`. Remote changes arrive with `origin: provider` and must NEVER enter the local undo stack.

### 5. Contract Single Source of Truth
- **NEVER edit files inside `frontend/src/shared/` directly.**
- All contract changes originate in `backend/src/shared/`. Run `make sync-shared` from the root workspace to synchronize.
- Verify parity with `npm run sync:shared:check`.

---

## Verification Workflow

- Unit & contract tests: `npm run test` (runs in ~1.0s with Vitest).
- Type checking: `npm run typecheck` (`tsc --noEmit`).
- Linting: `npm run lint` (`eslint`).
- Contract check: `npm run sync:shared:check`.
- E2E tests: `npm run test:e2e` (requires running frontend dev server).

## Git Submodule Protocol
- Always commit inside `frontend/` first following Conventional Commits (`feat(...)`, `fix(...)`, `docs(...)`, etc.).
- Husky hooks enforce lint and typecheck on pre-commit.
