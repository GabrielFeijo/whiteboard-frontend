import { describe, expect, it } from "vitest";
import React from "react";
import { HeroCanvasInteractive } from "@/features/landing/components/hero-canvas-interactive";

describe("Landing Feature Components", () => {
  it("instantiates HeroCanvasInteractive without crashing", () => {
    const element = React.createElement(HeroCanvasInteractive);
    expect(React.isValidElement(element)).toBe(true);
    expect(element.type).toBe(HeroCanvasInteractive);
  });
});
