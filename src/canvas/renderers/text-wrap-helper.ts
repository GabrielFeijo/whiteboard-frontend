function breakLongWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
): string[] {
  const parts: string[] = [];
  let current = "";
  for (const char of word) {
    const candidate = current + char;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      parts.push(current);
    }
    current = char;
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  if (!paragraph) {
    return [""];
  }
  if (maxWidth <= 0) {
    return [paragraph];
  }
  const words = paragraph.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (ctx.measureText(word).width <= maxWidth) {
      currentLine = word;
      continue;
    }

    const parts = breakLongWord(ctx, word, maxWidth);
    for (let i = 0; i < parts.length - 1; i++) {
      lines.push(parts[i]);
    }
    currentLine = parts[parts.length - 1] ?? "";
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text) {
    return [];
  }
  const paragraphs = text.split("\n");
  const result: string[] = [];
  for (const para of paragraphs) {
    const wrapped = wrapParagraph(ctx, para, maxWidth);
    result.push(...wrapped);
  }
  return result;
}
