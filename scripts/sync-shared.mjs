#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = resolve(root, process.env.BACKEND_DIR ?? "../backend");
const check = process.argv.includes("--check");

const pairs = [
  [join(backend, "src/shared"), join(root, "src/shared")],
  [join(backend, "fixtures/protocol"), join(root, "fixtures/protocol")],
];

function files(dir) {
  return existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => !f.startsWith("."))
        .sort()
    : [];
}

let drift = false;
for (const [src, dest] of pairs) {
  if (!existsSync(src)) {
    process.stderr.write(`Source directory not found: ${src} (set BACKEND_DIR)\n`);
    process.exit(2);
  }
  if (check) {
    const a = files(src);
    const b = files(dest);
    if (a.join() !== b.join()) drift = true;
    for (const f of a) {
      if (
        !existsSync(join(dest, f)) ||
        readFileSync(join(src, f), "utf8") !== readFileSync(join(dest, f), "utf8")
      ) {
        process.stderr.write(`DRIFT: ${join(dest, f)} differs from backend\n`);
        drift = true;
      }
    }
  } else {
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    process.stdout.write(`sync: ${src} -> ${dest}\n`);
  }
}
if (check) {
  process.stdout.write(drift ? "shared DIVERGED from backend\n" : "shared in sync with backend\n");
  process.exit(drift ? 1 : 0);
}
