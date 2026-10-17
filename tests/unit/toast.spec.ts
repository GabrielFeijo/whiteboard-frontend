import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  Toaster,
  toast,
  useToast,
} from "../../src/components/ui/toast";

describe("Toast UI Component and State Manager", () => {
  beforeEach(() => {
    toast.dismiss();
  });

  it("should export all expected Radix toast primitives and components", () => {
    expect(ToastProvider).toBeDefined();
    expect(ToastViewport).toBeDefined();
    expect(Toast).toBeDefined();
    expect(ToastTitle).toBeDefined();
    expect(ToastDescription).toBeDefined();
    expect(ToastAction).toBeDefined();
    expect(ToastClose).toBeDefined();
    expect(Toaster).toBeDefined();
    expect(toast).toBeDefined();
    expect(useToast).toBeDefined();
  });

  it("should create toast records via toast helper and variant shorthands", () => {
    const res1 = toast({
      title: "Custom Title",
      description: "Custom Description",
      variant: "default",
    });
    expect(res1.id).toBeDefined();
    expect(typeof res1.id).toBe("string");

    const resSuccess = toast.success("Success operation");
    expect(resSuccess.id).toBeDefined();

    const resError = toast.error("Error occurred");
    expect(resError.id).toBeDefined();

    const resWarning = toast.warning("Warning message");
    expect(resWarning.id).toBeDefined();

    const resInfo = toast.info("Info notice");
    expect(resInfo.id).toBeDefined();
  });

  it("should support toast dismissal and update", () => {
    const item = toast.success("Will dismiss");
    expect(typeof item.dismiss).toBe("function");
    expect(typeof item.update).toBe("function");

    item.update({ title: "Updated title" });
    item.dismiss();
  });

  it("should render Toaster and Toast elements with custom props", () => {
    const toasterElement = React.createElement(Toaster);
    expect(React.isValidElement(toasterElement)).toBe(true);

    const toastElement = React.createElement(
      Toast,
      {
        variant: "success",
        open: true,
      },
      React.createElement(ToastTitle, null, "Notification")
    );
    expect(React.isValidElement(toastElement)).toBe(true);
    expect(toastElement.props.variant).toBe("success");
  });
});
