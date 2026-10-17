import { describe, expect, it } from "vitest";
import React from "react";
import { AppLogo, AppLogoIcon } from "@/components/brand";

describe("Brand Components (AppLogo & AppLogoIcon)", () => {
  it("renders AppLogoIcon as valid SVG element", () => {
    const icon = React.createElement(AppLogoIcon, { className: "h-8 w-8" });
    expect(React.isValidElement(icon)).toBe(true);
    expect(icon.type).toBe(AppLogoIcon);
  });

  it("renders AppLogo with default props", () => {
    const logo = React.createElement(AppLogo);
    expect(React.isValidElement(logo)).toBe(true);
    expect(logo.props.size).toBeUndefined();
    expect(logo.props.showText).toBeUndefined();
  });

  it("renders AppLogo with size variants and icon-only mode", () => {
    const sizes = ["sm", "md", "lg", "xl"] as const;
    for (const size of sizes) {
      const element = React.createElement(AppLogo, {
        size,
        showText: false,
        className: "custom-logo-class",
      });
      expect(React.isValidElement(element)).toBe(true);
      expect(element.props.size).toBe(size);
      expect(element.props.showText).toBe(false);
      expect(element.props.className).toBe("custom-logo-class");
    }
  });
});
