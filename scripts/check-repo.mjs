#!/usr/bin/env node
/**
 * Structural checks over the repository. No API calls, no credentials.
 *
 * Catches the things that rot silently in a 67-lesson repo:
 *   - a lesson with no README, or a README with no 2026 status badge
 *   - a lesson whose README claims a `legacy` variant that does not exist
 *   - a `Run it` block naming a lesson number that is not this lesson
 *   - an implementation file with no README section describing it
 *   - a hardcoded model id outside the two config modules
 *   - a lesson that imports a shared module that does not exist
 *   - anything that looks like a committed secret
 *
 *   node scripts/check-repo.mjs
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LESSONS_DIR = join(REPO_ROOT, "lessons");

const STATUS_BADGES = ["🟢", "🟡", "🟠", "🔴"];

/** Model ids may only appear in the config modules and in documentation. */
const MODEL_PATTERN = /["'](claude-(?:opus|sonnet|haiku|fable|mythos)-[\w.-]+)["']/g;
const MODEL_ALLOWLIST = new Set([
  "shared/typescript/config.ts",
  "shared/python/course/config.py",
]);

/** Things that must never be committed. */
const SECRET_PATTERNS = [
  { name: "Anthropic API key", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Voyage API key", pattern: /pa-[A-Za-z0-9_-]{30,}/ },
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);

function walk(directory, predicate, found = []) {
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry === ".git" || entry === ".venv") continue;
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, predicate, found);
    else if (predicate(full)) found.push(full);
  }
  return found;
}

// ---------------------------------------------------------------------------
// 1. Every lesson has a README with a status badge, and it numbers itself right
// ---------------------------------------------------------------------------

const lessons = readdirSync(LESSONS_DIR)
  .filter((name) => statSync(join(LESSONS_DIR, name)).isDirectory())
  .sort();

if (lessons.length !== 67) {
  fail("lessons/", `expected 67 lesson directories, found ${lessons.length}`);
}

const seenNumbers = new Set();
for (const lesson of lessons) {
  const match = /^(\d{2})-/.exec(lesson);
  if (!match) {
    fail(lesson, "directory name must start with a two-digit lesson number");
    continue;
  }
  const number = match[1];
  if (seenNumbers.has(number)) fail(lesson, `duplicate lesson number ${number}`);
  seenNumbers.add(number);

  const readmePath = join(LESSONS_DIR, lesson, "README.md");
  if (!existsSync(readmePath)) {
    fail(lesson, "no README.md");
    continue;
  }
  const readme = readFileSync(readmePath, "utf8");

  if (!STATUS_BADGES.some((badge) => readme.includes(badge))) {
    fail(lesson, "README has no 2026 status badge (🟢/🟡/🟠/🔴)");
  }
  if (!readme.startsWith(`# ${number} · `)) {
    fail(lesson, `README title must start with "# ${number} · "`);
  }
  if (!readme.includes("## References")) {
    fail(lesson, "README has no References section");
  }

  // Every `npm run lesson -- NN` / `uv run lesson NN` must name THIS lesson.
  for (const [, cited] of readme.matchAll(
    /(?:npm run lesson -- |uv run lesson )(\d{2})/g,
  )) {
    if (cited !== number) {
      fail(lesson, `README run command names lesson ${cited}, not ${number}`);
    }
  }

  // Implementations exist for what the README promises, and vice versa.
  for (const language of ["python", "typescript"]) {
    const dir = join(LESSONS_DIR, lesson, language);
    if (!existsSync(dir)) continue;
    const extension = language === "python" ? ".py" : ".ts";
    const files = readdirSync(dir).filter((name) => name.endsWith(extension));
    for (const file of files) {
      const variant = file.slice(0, -extension.length);
      if (variant !== "example" && !readme.includes(variant)) {
        fail(lesson, `${language}/${file} exists but the README never mentions it`);
      }
    }
    // A README that tells you to run THIS language's legacy variant must have
    // one. A Python-only legacy note is not a missing TypeScript file.
    const runCommand =
      language === "python"
        ? `uv run lesson ${number} legacy`
        : `npm run lesson -- ${number} legacy`;
    if (readme.includes(runCommand) && !files.includes(`legacy${extension}`)) {
      fail(
        lesson,
        `README says to run ${language}/legacy${extension}, which is missing`,
      );
    }
  }

  // A lesson with implementations must document its environment variables.
  const hasCode =
    existsSync(join(LESSONS_DIR, lesson, "python")) ||
    existsSync(join(LESSONS_DIR, lesson, "typescript"));
  if (hasCode && !readme.includes("## Environment variables")) {
    fail(lesson, "README has no Environment variables section");
  }
}

// ---------------------------------------------------------------------------
// 1b. The status badge agrees across all three places it is written
// ---------------------------------------------------------------------------

/** Pull `| 12 | ... | 🟡 | ...` rows out of an index table. */
function badgesFromTable(path) {
  const found = new Map();
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^\|\s*(\d{1,2})\s*\|[^|]*\|\s*(🟢|🟡|🟠|🔴)\s*\|/.exec(line.trim());
    if (match) found.set(Number(match[1]), match[2]);
  }
  return found;
}

const rootBadges = badgesFromTable(join(REPO_ROOT, "README.md"));
const auditBadges = badgesFromTable(join(REPO_ROOT, "docs", "MODERNIZATION.md"));

for (const lesson of lessons) {
  const number = Number(lesson.slice(0, 2));
  const readmePath = join(LESSONS_DIR, lesson, "README.md");
  if (!existsSync(readmePath)) continue;
  const match = /\*\*2026 status: (🟢|🟡|🟠|🔴)/.exec(readFileSync(readmePath, "utf8"));
  if (!match) {
    fail(lesson, "README has no `**2026 status: <badge>` line");
    continue;
  }
  const badge = match[1];
  if (rootBadges.get(number) !== badge) {
    fail(
      lesson,
      `status ${badge} but the root README index says ${rootBadges.get(number) ?? "nothing"}`,
    );
  }
  if (auditBadges.get(number) !== badge) {
    fail(
      lesson,
      `status ${badge} but docs/MODERNIZATION.md says ${auditBadges.get(number) ?? "nothing"}`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. No hardcoded model ids outside the config modules
// ---------------------------------------------------------------------------

const codeFiles = walk(
  REPO_ROOT,
  (path) =>
    (path.endsWith(".ts") || path.endsWith(".py") || path.endsWith(".mjs")) &&
    !path.includes(`${REPO_ROOT}/outputs`),
);

for (const path of codeFiles) {
  const relativePath = relative(REPO_ROOT, path);
  if (MODEL_ALLOWLIST.has(relativePath)) continue;
  // legacy.* files pin an old model on purpose - that IS the lesson.
  if (/\/legacy\.(ts|py)$/.test(relativePath)) continue;
  const source = readFileSync(path, "utf8");
  for (const [, model] of source.matchAll(MODEL_PATTERN)) {
    fail(
      relativePath,
      `hardcodes the model id "${model}" - import MODEL/FAST_MODEL from config instead`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Relative imports resolve
// ---------------------------------------------------------------------------

for (const path of codeFiles.filter((file) => file.endsWith(".ts"))) {
  const source = readFileSync(path, "utf8");
  for (const [, specifier] of source.matchAll(/from\s+"(\.[^"]+)"/g)) {
    const resolved = resolve(dirname(path), specifier);
    if (!existsSync(resolved)) {
      fail(relative(REPO_ROOT, path), `import "${specifier}" does not resolve`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. No committed secrets, and .env.example holds no values
// ---------------------------------------------------------------------------

const textFiles = walk(
  REPO_ROOT,
  (path) =>
    /\.(ts|py|mjs|json|md|toml|example|yml|yaml)$/.test(path) &&
    !path.endsWith("package-lock.json") &&
    !path.endsWith("uv.lock") &&
    !path.includes(`${REPO_ROOT}/outputs`),
);

for (const path of textFiles) {
  const source = readFileSync(path, "utf8");
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(source)) {
      fail(relative(REPO_ROOT, path), `looks like it contains a ${name}`);
    }
  }
}

const envExample = join(REPO_ROOT, ".env.example");
if (!existsSync(envExample)) {
  fail(".env.example", "missing");
} else {
  for (const line of readFileSync(envExample, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [, value] = trimmed.split("=", 2);
    if (value && value.length > 0) {
      fail(".env.example", `"${trimmed.split("=")[0]}" has a value - it must be empty`);
    }
  }
}

if (existsSync(join(REPO_ROOT, ".env"))) {
  const gitignore = readFileSync(join(REPO_ROOT, ".gitignore"), "utf8");
  if (!gitignore.split("\n").some((line) => line.trim() === ".env")) {
    fail(".gitignore", ".env exists but is not ignored");
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (problems.length === 0) {
  console.log(`repo check: ${lessons.length} lessons, no problems`);
  process.exit(0);
}

console.error(`repo check: ${problems.length} problem(s)\n`);
for (const problem of problems) console.error(`  ${problem}`);
process.exit(1);
