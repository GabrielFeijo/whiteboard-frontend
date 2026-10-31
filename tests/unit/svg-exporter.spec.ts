import { describe, expect, it } from "vitest";
import { renderElementToSvgMarkup } from "@/features/export/services/svg-exporter";
import { ElementData, ElementType } from "@/shared";

describe("SVG Exporter Service and Markup Security", () => {
  it("escapes special XML characters in fill and stroke attributes", () => {
    const maliciousRect: ElementData = {
      id: "rect-1",
      type: ElementType.RECT,
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      rotation: 0,
      z: "a0",
      createdBy: "u1",
      style: {
        fill: 'red" onload="alert(1)"',
        stroke: '#000" <script>',
        strokeWidth: 2,
        opacity: 1,
      },
    };

    const markup = renderElementToSvgMarkup(maliciousRect);
    expect(markup).not.toContain('fill="red" onload=');
    expect(markup).toContain('&quot;');
    expect(markup).not.toContain('<script>');
    expect(markup).toContain('&lt;script&gt;');
  });

  it("renders image elements into SVG image tags with escaped src", () => {
    const imageEl: ElementData = {
      id: "img-1",
      type: ElementType.IMAGE,
      x: 50,
      y: 60,
      w: 200,
      h: 150,
      rotation: 0,
      z: "a1",
      createdBy: "u1",
      src: "https://example.com/photo.png?a=1&b=2",
      style: {
        fill: "transparent",
        stroke: "transparent",
        strokeWidth: 0,
        opacity: 0.9,
      },
    };

    const markup = renderElementToSvgMarkup(imageEl);
    expect(markup).toContain("<image");
    expect(markup).toContain('href="https://example.com/photo.png?a=1&amp;b=2"');
    expect(markup).toContain('width="200"');
    expect(markup).toContain('height="150"');
    expect(markup).toContain('opacity="0.9"');
  });

  it("renders bound arrows as cubic Bezier paths and wraps rotated elements with transform", () => {
    const shapeA: ElementData = {
      id: "shape-a",
      type: ElementType.RECT,
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      rotation: 45,
      z: "a0",
      text: "Line 1\nLine 2",
      createdBy: "u1",
      style: { fill: "#ffffff", stroke: "#000000", strokeWidth: 2, opacity: 1 },
    };

    const rectMarkup = renderElementToSvgMarkup(shapeA);
    expect(rectMarkup).toContain('transform="rotate(45 50 50)"');
    expect(rectMarkup).toContain("<tspan");
    expect(rectMarkup).toContain("Line 1");
    expect(rectMarkup).toContain("Line 2");

    const boundArrow: ElementData = {
      id: "arrow-1",
      type: ElementType.ARROW,
      x: 100,
      y: 50,
      w: 200,
      h: 50,
      rotation: 0,
      z: "a1",
      createdBy: "u1",
      startBinding: { elementId: "shape-a", anchor: "right" },
      points: [100, 50, 300, 100],
      style: { fill: "transparent", stroke: "#ef4444", strokeWidth: 2, opacity: 1 },
    };

    const arrowMarkup = renderElementToSvgMarkup(boundArrow, (id) =>
      id === "shape-a" ? shapeA : null,
    );
    expect(arrowMarkup).toContain("M 85 85 C");
    expect(arrowMarkup).toContain(", 300 100");
  });
});
