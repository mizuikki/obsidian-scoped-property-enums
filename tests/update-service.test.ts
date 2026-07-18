import { describe, expect, it, vi } from "vitest";
import type { TFile } from "obsidian";
import { cloneDefaultSettings, type ScopedEnumRule } from "../src/rules";
import {
  ScopedEnumUpdateError,
  ScopedEnumUpdateService,
  type FrontmatterFileManager,
} from "../src/update-service";

const file = { path: "10-Projects/example.md" } as TFile;

describe("ScopedEnumUpdateService", () => {
  it("revalidates type, rule, and candidate inside the frontmatter callback", async () => {
    const frontmatter: Record<string, unknown> = { type: "project", status: "active" };
    let rules = cloneDefaultSettings().enumRules;
    const manager: FrontmatterFileManager = {
      processFrontMatter: vi.fn(async (_file, callback) => callback(frontmatter)),
    };
    const service = new ScopedEnumUpdateService(manager, () => rules);
    const pending = service.update(file, "status", "completed");
    rules = [];
    await expect(pending).rejects.toBeInstanceOf(ScopedEnumUpdateError);
    expect(frontmatter.status).toBe("active");
  });

  it("rejects a stale value after a rule changes", async () => {
    const frontmatter: Record<string, unknown> = { type: "project", status: "active" };
    let rules: ScopedEnumRule[] = cloneDefaultSettings().enumRules;
    const manager: FrontmatterFileManager = {
      processFrontMatter: vi.fn(async (_file, callback) => callback(frontmatter)),
    };
    const service = new ScopedEnumUpdateService(manager, () => rules);
    const pending = service.update(file, "status", "completed");
    rules = rules.map((rule) =>
      rule.type === "project" ? { ...rule, values: ["active"] } : rule,
    );
    await expect(pending).rejects.toThrow("no longer allowed");
    expect(frontmatter.status).toBe("active");
  });

  it("writes only the selected key and preserves an illegal value until selection", async () => {
    const frontmatter: Record<string, unknown> = {
      type: "project-note",
      note_kind: "design",
      project_id: "example",
    };
    const before = structuredClone(frontmatter);
    const manager: FrontmatterFileManager = {
      processFrontMatter: vi.fn(async (_file, callback) => callback(frontmatter)),
    };
    const service = new ScopedEnumUpdateService(
      manager,
      () => cloneDefaultSettings().enumRules,
    );
    expect(frontmatter).toEqual(before);
    await service.update(
      { path: "11-Project-Notes/example.md" } as TFile,
      "note_kind",
      "research",
    );
    expect(frontmatter).toEqual({ ...before, note_kind: "research" });
  });

  it("propagates YAML parsing failures without invoking the callback", async () => {
    const yamlError = new Error("YAML parse failed");
    const manager: FrontmatterFileManager = {
      processFrontMatter: vi.fn(async () => {
        throw yamlError;
      }),
    };
    const service = new ScopedEnumUpdateService(
      manager,
      () => cloneDefaultSettings().enumRules,
    );
    await expect(service.update(file, "status", "completed")).rejects.toBe(yamlError);
  });

  it("does not create a duplicate key with different casing", async () => {
    const frontmatter: Record<string, unknown> = {
      type: "project",
      Status: "active",
    };
    const manager: FrontmatterFileManager = {
      processFrontMatter: vi.fn(async (_file, callback) => callback(frontmatter)),
    };
    const service = new ScopedEnumUpdateService(
      manager,
      () => cloneDefaultSettings().enumRules,
    );
    await expect(service.update(file, "status", "completed")).rejects.toThrow(
      "differently-cased",
    );
    expect(frontmatter).toEqual({ type: "project", Status: "active" });
  });

  it("serializes writes per file and deduplicates identical pending selections", async () => {
    const starts: string[] = [];
    const releases: Array<() => void> = [];
    const frontmatter: Record<string, unknown> = { type: "project", status: "active" };
    const manager: FrontmatterFileManager = {
      processFrontMatter: vi.fn(async (_file, callback) => {
        starts.push("start");
        callback(frontmatter);
        await new Promise<void>((resolve) => releases.push(resolve));
      }),
    };
    const service = new ScopedEnumUpdateService(
      manager,
      () => cloneDefaultSettings().enumRules,
    );
    const first = service.update(file, "status", "on-hold");
    const duplicate = service.update(file, "status", "on-hold");
    const second = service.update(file, "status", "completed");
    expect(duplicate).toBe(first);
    await vi.waitFor(() => expect(starts).toHaveLength(1));
    releases.shift()?.();
    await vi.waitFor(() => expect(starts).toHaveLength(2));
    releases.shift()?.();
    await Promise.all([first, second]);
    expect(frontmatter.status).toBe("completed");
  });

  it("requeues a later identical selection after an intervening different value", async () => {
    const starts: string[] = [];
    const releases: Array<() => void> = [];
    const frontmatter: Record<string, unknown> = { type: "project", status: "active" };
    const manager: FrontmatterFileManager = {
      processFrontMatter: vi.fn(async (_file, callback) => {
        starts.push("start");
        callback(frontmatter);
        await new Promise<void>((resolve) => releases.push(resolve));
      }),
    };
    const service = new ScopedEnumUpdateService(
      manager,
      () => cloneDefaultSettings().enumRules,
    );
    const firstActive = service.update(file, "status", "active");
    const completed = service.update(file, "status", "completed");
    const finalActive = service.update(file, "status", "active");
    expect(finalActive).not.toBe(firstActive);
    await vi.waitFor(() => expect(starts).toHaveLength(1));
    releases.shift()?.();
    await vi.waitFor(() => expect(starts).toHaveLength(2));
    releases.shift()?.();
    await vi.waitFor(() => expect(starts).toHaveLength(3));
    releases.shift()?.();
    await Promise.all([firstActive, completed, finalActive]);
    expect(frontmatter.status).toBe("active");
  });
});
