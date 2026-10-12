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
