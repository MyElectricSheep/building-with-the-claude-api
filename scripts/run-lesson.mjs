#!/usr/bin/env node
/**
 * Lesson runner.
 *
 *   npm run lesson -- 03            # lessons/03-x/typescript/example.ts
 *   npm run lesson -- 06 legacy     # lessons/06-x/typescript/legacy.ts
 *   npm run lesson -- 40 -- --help  # everything after a bare -- goes to the lesson
 *
 * Node 22.18+ runs TypeScript directly (type stripping), so there is no build
 * step and no ts-node/tsx dependency.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LESSONS_DIR = join(REPO_ROOT, "lessons");

/** Resolve "3", "03" or "03-making-a-request" to a lesson directory name. */
export function resolveLessonDir(lessons, spec) {
  const padded = /^\d+$/.test(spec) ? String(spec).padStart(2, "0") : spec;
  const exact = lessons.find((name) => name === padded);
  if (exact) return exact;
  const byNumber = lessons.filter((name) => name.startsWith(`${padded}-`));
  if (byNumber.length === 1) return byNumber[0];
  const bySlug = lessons.filter((name) => name.includes(padded));
  if (bySlug.length === 1) return bySlug[0];
  if (bySlug.length > 1) {
    throw new Error(`"${spec}" matches several lessons: ${bySlug.join(", ")}`);
  }
  throw new Error(`No lesson matches "${spec}".`);
}

function main() {
  const [spec, ...rest] = process.argv.slice(2);
  if (!spec || spec === "--help" || spec === "-h") {
    console.log("Usage: npm run lesson -- <number|slug> [variant] [-- args...]");
    console.log("Example: npm run lesson -- 03");
    console.log("         npm run lesson -- 06 legacy");
    process.exit(spec ? 0 : 1);
  }

  const lessons = readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const lesson = resolveLessonDir(lessons, spec);

  const separator = rest.indexOf("--");
  const positional = separator === -1 ? rest : rest.slice(0, separator);
  const forwarded = separator === -1 ? [] : rest.slice(separator + 1);
  const variant = positional[0] ?? "example";

  const entry = join(LESSONS_DIR, lesson, "typescript", `${variant}.ts`);
  if (!existsSync(entry)) {
    const dir = join(LESSONS_DIR, lesson, "typescript");
    const available = existsSync(dir)
      ? readdirSync(dir)
          .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
          .join(", ")
      : "(no typescript/ directory - this lesson is conceptual)";
    console.error(`No ${variant}.ts in ${lesson}/typescript. Available: ${available}`);
    console.error(`See lessons/${lesson}/README.md`);
    process.exit(1);
  }

  const envFile = join(REPO_ROOT, ".env");
  const nodeArgs = [];
  if (existsSync(envFile)) nodeArgs.push(`--env-file=${envFile}`);
  nodeArgs.push(entry, ...forwarded);

  console.error(`$ node ${nodeArgs.join(" ")}`);
  const child = spawn(process.execPath, nodeArgs, {
    stdio: "inherit",
    cwd: REPO_ROOT,
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) main();
