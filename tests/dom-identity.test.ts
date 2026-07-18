// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { canonicalBaseProperty, exactRowFilePath } from "../src/dom-identity";

function loadFixture(name: string): void {
  document.body.innerHTML = readFileSync(
    resolve("tests/fixtures/obsidian-1.12.7", name),
    "utf8",
  );
}

describe("Obsidian 1.12.7 Bases DOM identity", () => {
  beforeEach(() => loadFixture("top-level-base.html"));

  it("maps a sorted row to its exact file and canonical note property", () => {
    const cell = document.querySelector<HTMLElement>(
      "#project-b .bases-td[data-property='note.status']",
    )!;
    expect(canonicalBaseProperty(cell)).toBe("status");
    expect(exactRowFilePath(cell)).toBe("10-Projects/b.md");
  });

  it("does not enhance formula or file.* computed columns", () => {
    const formula = document.querySelector<HTMLElement>(
      "#project-b .bases-td[data-property='formula.health']",
    )!;
    const file = document.querySelector<HTMLElement>(
      "#project-a .bases-td[data-property='file.mtime']",
    )!;
    expect(canonicalBaseProperty(formula)).toBeNull();
    expect(canonicalBaseProperty(file)).toBeNull();
  });

  it("fails closed when the file identity column is hidden or ambiguous", () => {
    const cell = document.querySelector<HTMLElement>(
      "#project-b .bases-td[data-property='note.status']",
    )!;
    document.querySelector("#project-b .bases-td[data-property='file.name']")?.remove();
    expect(exactRowFilePath(cell)).toBeNull();

    loadFixture("top-level-base.html");
    const ambiguous = document.querySelector<HTMLElement>(
      "#project-b .bases-td[data-property='note.status']",
    )!;
    document
      .querySelector("#project-b .bases-td[data-property='file.name']")
      ?.insertAdjacentHTML("beforeend", '<a data-href="10-Projects/other.md">other</a>');
    expect(exactRowFilePath(ambiguous)).toBeNull();
  });

  it("continues to resolve after rows are filtered or reordered", () => {
    document.querySelector("#project-a")?.remove();
    const row = document.querySelector("#project-b")!;
    row.parentElement?.prepend(row);
    const cell = row.querySelector<HTMLElement>("[data-property='note.status']")!;
    expect(exactRowFilePath(cell)).toBe("10-Projects/b.md");
  });

  it("uses the same exact mapping in an embedded Base", () => {
    loadFixture("embedded-base.html");
    const cell = document.querySelector<HTMLElement>(
      "#adr-row .bases-td[data-property='note.status']",
    )!;
    expect(canonicalBaseProperty(cell)).toBe("status");
    expect(exactRowFilePath(cell)).toBe("12-ADR/example - ADR-001 - Choice.md");
  });
});
