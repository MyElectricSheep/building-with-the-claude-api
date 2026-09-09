/**
 * A sandboxed handler for the Anthropic-defined text editor tool
 * (`text_editor_20250728` / `str_replace_based_edit_tool`), lesson 30.
 *
 * The tool is schema-less: Anthropic defines the commands, your application
 * executes them. Which means the safety is yours to write.
 *
 * Commands: view, str_replace, create, insert.
 * `undo_edit` was REMOVED in text_editor_20250429 - it is not implemented here,
 * and a request for it returns an error result.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export interface EditorResult {
  content: string;
  isError: boolean;
}

export class SandboxedEditor {
  private readonly root: string;
  private readonly maxCharacters: number;

  constructor(root: string, maxCharacters = 10_000) {
    this.root = resolve(root);
    this.maxCharacters = maxCharacters;
    mkdirSync(this.root, { recursive: true });
  }

  /**
   * Resolve a model-supplied path inside the sandbox, or refuse.
   *
   * `../../.ssh/id_rsa` is a perfectly reasonable-looking `path` for a model to
   * emit. Your process is the one doing the writing.
   */
  private safePath(candidate: string): string {
    const resolved = resolve(this.root, candidate);
    const rel = relative(this.root, resolved);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new Error(`Path escapes the sandbox: ${candidate}`);
    }
    return resolved;
  }

  /** Anthropic's guidance recommends a backup. `undo_edit` no longer exists. */
  private backup(path: string): void {
    if (existsSync(path)) copyFileSync(path, `${path}.backup`);
  }

  handle(input: Record<string, unknown>): EditorResult {
    try {
      const command = String(input.command ?? "");
      switch (command) {
        case "view":
          return this.view(input);
        case "str_replace":
          return this.strReplace(input);
        case "create":
          return this.create(input);
        case "insert":
          return this.insert(input);
        case "undo_edit":
          // Removed in text_editor_20250429. Say so plainly so the model can
          // pick a different approach.
          return {
            content:
              "Error: undo_edit is not supported by text_editor_20250728. " +
              "Supported commands: view, str_replace, create, insert.",
            isError: true,
          };
        default:
          return {
            content:
              `Error: unknown command ${JSON.stringify(command)}. ` +
              "Supported commands: view, str_replace, create, insert.",
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        isError: true,
      };
    }
  }

  private view(input: Record<string, unknown>): EditorResult {
    const path = this.safePath(String(input.path ?? ""));
    if (!existsSync(path)) return { content: "Error: File not found", isError: true };

    if (statSync(path).isDirectory()) {
      return { content: readdirSync(path).sort().join("\n"), isError: false };
    }

    const lines = readFileSync(path, "utf8").split("\n");
    let from = 1;
    let to = lines.length;
    if (Array.isArray(input.view_range)) {
      const [start, end] = input.view_range as [number, number];
      from = start;
      // -1 means "to the end of the file".
      to = end === -1 ? lines.length : end;
    }
    const numbered = lines
      .slice(from - 1, to)
      .map((line, offset) => `${String(from + offset).padStart(5)}\t${line}`)
      .join("\n");
    // max_characters, new in text_editor_20250728.
    const truncated =
      numbered.length > this.maxCharacters
        ? `${numbered.slice(0, this.maxCharacters)}\n... [truncated]`
        : numbered;
    return { content: truncated, isError: false };
  }

  private strReplace(input: Record<string, unknown>): EditorResult {
    const path = this.safePath(String(input.path ?? ""));
    if (!existsSync(path)) return { content: "Error: File not found", isError: true };

    const oldStr = String(input.old_str ?? "");
    const newStr = String(input.new_str ?? "");
    const original = readFileSync(path, "utf8");

    // Exactly one match, or refuse. A silent replace-all is a corrupted file.
    const occurrences = original.split(oldStr).length - 1;
    if (occurrences === 0) {
      return { content: "Error: old_str not found in the file", isError: true };
    }
    if (occurrences > 1) {
      return {
        content: `Error: old_str matched ${occurrences} times; it must match exactly once`,
        isError: true,
      };
    }

    this.backup(path);
    writeFileSync(path, original.replace(oldStr, newStr), "utf8");
    return { content: "Edit applied.", isError: false };
  }

  private create(input: Record<string, unknown>): EditorResult {
    const path = this.safePath(String(input.path ?? ""));
    this.backup(path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, String(input.file_text ?? ""), "utf8");
    return { content: `Created ${relative(this.root, path)}.`, isError: false };
  }

  private insert(input: Record<string, unknown>): EditorResult {
    const path = this.safePath(String(input.path ?? ""));
    if (!existsSync(path)) return { content: "Error: File not found", isError: true };

    const lines = readFileSync(path, "utf8").split("\n");
    const at = Number(input.insert_line ?? 0); // 0 means "before line 1"
    if (at < 0 || at > lines.length) {
      return {
        content: `Error: insert_line ${at} is outside 0..${lines.length}`,
        isError: true,
      };
    }
    this.backup(path);
    lines.splice(at, 0, String(input.insert_text ?? ""));
    writeFileSync(path, lines.join("\n"), "utf8");
    return { content: `Inserted after line ${at}.`, isError: false };
  }
}
