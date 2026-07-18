import { describe, expect, it } from "vitest";
import {
  cloneDefaultSettings,
  matchRule,
  validateSettings,
  type ScopedEnumRule,
} from "../src/rules";

describe("settings validation", () => {
  it("accepts the complete default configuration", () => {
    const result = validateSettings(cloneDefaultSettings());
    expect(result.errors).toEqual([]);
    expect(result.rules).toHaveLength(4);
  });

  it("disables every rule for an unknown schema version", () => {
    const result = validateSettings({ schemaVersion: 2, enumRules: [] });
    expect(result.supportedVersion).toBe(false);
    expect(result.rules).toEqual([]);
    expect(result.errors[0].path).toBe("schemaVersion");
  });

  it.each([
    ["empty folder", { folders: [""], type: "x", property: "p", values: ["v"] }],
    ["folder whitespace", { folders: [" x"], type: "x", property: "p", values: ["v"] }],
    ["non-POSIX folder", { folders: ["x\\y"], type: "x", property: "p", values: ["v"] }],
    ["duplicate folder", { folders: ["x", "x"], type: "x", property: "p", values: ["v"] }],
    ["overlapping folders", { folders: ["x", "x/y"], type: "x", property: "p", values: ["v"] }],
    ["type whitespace", { folders: ["x"], type: "x ", property: "p", values: ["v"] }],
    ["empty property", { folders: ["x"], type: "x", property: "", values: ["v"] }],
    ["duplicate value", { folders: ["x"], type: "x", property: "p", values: ["v", "v"] }],
  ])("rejects %s without rewriting it", (_name, rule) => {
    const raw = { schemaVersion: 1, enumRules: [rule] };
    const snapshot = structuredClone(raw);
    const result = validateSettings(raw);
    expect(result.rules).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(raw).toEqual(snapshot);
  });

  it("reports unknown fields and excludes a rule with a misspelled field", () => {
    const result = validateSettings({
      schemaVersion: 1,
      enumRules: [
        {
          folders: ["x"],
          type: "x",
          property: "p",
          values: ["v"],
          value: ["typo"],
        },
      ],
      extra: true,
    });
    expect(result.rules).toEqual([]);
    expect(result.errors.map((error) => error.path)).toEqual(
      expect.arrayContaining(["extra", "enumRules[0].value"]),
    );
  });

  it("disables both rules whose same-type/property folder scopes overlap", () => {
    const result = validateSettings({
      schemaVersion: 1,
      enumRules: [
        { folders: ["notes"], type: "x", property: "p", values: ["a"] },
        { folders: ["notes/sub"], type: "x", property: "p", values: ["b"] },
        { folders: ["notes/sub"], type: "y", property: "p", values: ["c"] },
      ],
    });
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0].type).toBe("y");
    expect(result.errors[0].message).toContain("overlaps");
  });
});

describe("rule matching", () => {
  const rule: ScopedEnumRule = {
    folders: ["05-Proposals"],
    type: "proposal",
    property: "status",
    values: ["draft"],
  };

  it("matches direct and recursive descendants on a folder boundary", () => {
    expect(matchRule([rule], "05-Proposals/a.md", "proposal", "status")).toBe(rule);
    expect(matchRule([rule], "05-Proposals/sub/a.md", "proposal", "status")).toBe(rule);
    expect(matchRule([rule], "05-Proposals-Old/a.md", "proposal", "status")).toBeNull();
  });

  it("matches type and property with exact case", () => {
    expect(matchRule([rule], "05-Proposals/a.md", "Proposal", "status")).toBeNull();
    expect(matchRule([rule], "05-Proposals/a.md", "proposal", "Status")).toBeNull();
    expect(matchRule([rule], "05-Proposals/a.md", undefined, "status")).toBeNull();
  });

  it("fails closed when more than one rule matches", () => {
    expect(matchRule([rule, { ...rule }], "05-Proposals/a.md", "proposal", "status")).toBeNull();
  });
});
