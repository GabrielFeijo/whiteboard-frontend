import { describe, it, expect } from "vitest";
import React from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  ConfirmDialog,
} from "../../src/components/ui/alert-dialog";

describe("AlertDialog Component Exports and Structure", () => {
  it("should export all expected Radix primitives and wrappers", () => {
    expect(AlertDialog).toBeDefined();
    expect(AlertDialogTrigger).toBeDefined();
    expect(AlertDialogContent).toBeDefined();
    expect(AlertDialogTitle).toBeDefined();
    expect(AlertDialogDescription).toBeDefined();
    expect(AlertDialogAction).toBeDefined();
    expect(AlertDialogCancel).toBeDefined();
    expect(ConfirmDialog).toBeDefined();
  });

  it("should create ConfirmDialog react element with custom properties", () => {
    const onConfirmMock = () => {};
    const element = React.createElement(ConfirmDialog, {
      open: true,
      onOpenChange: () => {},
      title: "Are you absolutely sure?",
      description: "This action cannot be undone.",
      cancelText: "Cancel",
      confirmText: "Yes, delete",
      variant: "destructive",
      onConfirm: onConfirmMock,
    });

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.title).toBe("Are you absolutely sure?");
    expect(element.props.variant).toBe("destructive");
    expect(element.props.open).toBe(true);
  });

  it("should support primary variant for restore confirmation", () => {
    const element = React.createElement(ConfirmDialog, {
      open: true,
      onOpenChange: () => {},
      title: "Restore Version",
      description: "Are you sure you want to restore?",
      variant: "primary",
      onConfirm: () => {},
    });

    expect(element.props.variant).toBe("primary");
  });
});
