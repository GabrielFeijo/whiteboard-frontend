#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
    console.error(`Fonte não encontrada: ${src} (defina BACKEND_DIR)`);
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
        console.error(`DRIFT: ${join(dest, f)} difere do backend`);
        drift = true;
      }
    }
  } else {
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log(`sync: ${src} -> ${dest}`);
  }
}
if (check) {
  console.log(drift ? "shared DIVERGENTE do backend" : "shared em sincronia com o backend");
  process.exit(drift ? 1 : 0);
}
