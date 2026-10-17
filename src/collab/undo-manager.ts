import * as Y from "yjs";
import { getDocRoots } from "../shared";

export const LOCAL_ORIGIN = Symbol("local-user-origin");

export class LocalUndoManager {
  private undoManager: Y.UndoManager;

  constructor(doc: Y.Doc) {
    const roots = getDocRoots(doc);
    this.undoManager = new Y.UndoManager(roots.elements, {
      trackedOrigins: new Set([LOCAL_ORIGIN]),
      captureTimeout: 500,
    });
  }

  canUndo(): boolean {
    return this.undoManager.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.undoManager.redoStack.length > 0;
  }

  onStackChange(listener: (status: { canUndo: boolean; canRedo: boolean }) => void): () => void {
    const notify = () => {
      listener({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
      });
    };

    this.undoManager.on("stack-item-added", notify);
    this.undoManager.on("stack-item-popped", notify);
    this.undoManager.on("stack-cleared", notify);

    notify();

    return () => {
      this.undoManager.off("stack-item-added", notify);
      this.undoManager.off("stack-item-popped", notify);
      this.undoManager.off("stack-cleared", notify);
    };
  }

  undo() {
    this.undoManager.undo();
  }

  redo() {
    this.undoManager.redo();
  }

  stopCapturing() {
    this.undoManager.stopCapturing();
  }

  destroy() {
    this.undoManager.destroy();
  }
}
