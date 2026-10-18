# Agent Guidelines — Frontend Submodule

This document establishes operational standards, architectural invariants, code quality rules, and commit conventions for all human engineers and autonomous AI agents working inside the `frontend/` submodule.

---

## 🏛️ Stack & Architecture Context

This application runs **Next.js 16 (App Router)** with **React 19**, **Tailwind CSS 4**, and a proprietary **2D Canvas Engine**. APIs, routing conventions, and file structure follow modern Next.js 16 patterns.

### Directory Layout & Core Systems
- `src/app/`: Next.js App Router containing route handlers, pages (`/`, `/boards`, `/board/[id]`, `/login`, `/register`), and layouts.
- `src/canvas/`: Custom 2D Canvas Engine.
  - `engine.ts`: Core canvas engine orchestrating the 60 FPS animation loop, dirty-flag render triggering, and layer dispatch.
  - `viewport.ts`: Camera system managing pan `{ x, y }`, zoom (`0.1x` to `5.0x`), and matrix transformations (`screenToWorld`, `worldToScreen`).
  - `spatial-index.ts`: R-Tree index (RBush) providing $O(\log N)$ spatial lookups, viewport culling, and point/box hit-testing.
  - `renderers/`: Modular element renderers (shape, connector/arrow, pencil, sticky note, text, image, grid, selection overlay).
  - `tools/`: Decoupled tool strategy pattern (SelectTool, HandTool, ShapeTool, PencilTool, ConnectorTool, StickyTool, TextTool, EraserTool).
  - `alignment-helper.ts`: Smart magnetic alignment guides and distance snapping.
- `src/collab/`: Distributed state and real-time synchronization.
  - `provider.ts`: WebSocket client connecting to the Collab server on port 3002 using ticket-based authentication.
  - `awareness.ts`: User presence broadcast with linear interpolation (lerp at ~30Hz), remote cursor coordinates, and selection bounds.
  - `undo-manager.ts`: `Y.UndoManager` configured with `trackedOrigins` isolating local user edits from remote peer updates.
- `src/features/`: Functional domain modules (auth, boards, studio).
- `src/shared/`: Mirrored contract definitions synchronized from backend.
- `tests/`: Vitest unit tests, contract tests, and Playwright E2E tests.

---

## 🚫 Prohibited Comments & Documentation Standards

1. **No AI/Model Signatures**: Never add comments stating that code was generated, modified, or assisted by an AI model.
2. **No Dead Commented Code**: Never leave blocks of commented-out code.
3. **No Redundant Comments**: Do not write comments that merely repeat self-explanatory code (e.g., `// Set zoom level` before `this.zoom = newZoom;`).
4. **No Unanchored TODOs**: Never leave untracked `// TODO` comments.
5. **Language Requirement**: All comments, docstrings, and commits must be authored in **English**.

---

## 🛑 Prohibited Frontend Code Smells & Antipatterns

1. **Coordinate System Confusion**:
   - **Never mix Screen Coordinates and World Coordinates.**
   - Raw mouse/pointer events live in Screen space. Canvas elements live in World space.
   - Always convert explicitly via `viewport.screenToWorld(screenX, screenY)` before modifying element bounds, and `viewport.worldToScreen(worldX, worldY)` when rendering overlays.
2. **Spatial Index Drift**:
   - Never mutate an element's position, width, height, or existence without updating `SpatialIndex` (RBush). A desynchronized spatial index causes elements to disappear from viewport culling or fail hit-testing.
3. **Untagged Yjs Transactions**:
   - Never modify the `elements` Y.Map without passing `{ origin: store.localOrigin }`. Without origin tagging, local edits cannot be distinguished from remote updates, causing infinite undo/redo corruption.
4. **Direct Edits to `src/shared/`**:
   - **Never edit files in `frontend/src/shared/` directly.** All contract definitions originate in `backend/src/shared/`.
5. **Type Safety Smells**:
   - Never use `any` or `as any`. Use strict TypeScript interfaces, generics, or Zod schemas.
   - Never use `@ts-ignore` or `@ts-nocheck`.
6. **State & React Smells**:
   - Never trigger un-batched state updates inside the 60 FPS canvas render loop. Keep high-frequency drawing inside the native canvas context, and update React state only on discrete interaction boundaries (e.g. pointer up, tool selection).

---

## 📦 Commit Message Standardization

All commits inside `frontend/` must strictly follow Conventional Commits:

```
<type>(<scope>): <subject in lowercase imperative mood>
```

- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.
- **Frontend Scopes**: `canvas`, `tools`, `renderers`, `collab`, `studio`, `auth`, `boards`, `i18n`.
- **Examples**:
  - `feat(canvas): add magnetic snap guides on element drag`
  - `fix(studio): prevent cursor flicker during zoom gesture`
  - `refactor(tools): extract common bounding box calculation into geometry helper`

---

## 🛠️ Verification Workflow

Before committing in `frontend/`, verify that all quality gates pass:

```bash
# Run unit & contract tests (Vitest)
npm run test

# Run TypeScript typecheck (tsc --noEmit)
npm run typecheck

# Run ESLint
npm run lint

# Verify shared contracts parity:
npm run sync:shared:check
```
