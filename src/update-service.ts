import type { TFile } from "obsidian";
import type { ScopedEnumRule } from "./rules";
import { matchRule } from "./rules";

export interface FrontmatterFileManager {
  processFrontMatter(
    file: TFile,
    callback: (frontmatter: Record<string, unknown>) => void,
  ): Promise<void>;
}

export class ScopedEnumUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScopedEnumUpdateError";
  }
}

export class ScopedEnumUpdateService {
  private readonly queues = new Map<string, Promise<void>>();
  private readonly pending = new Map<string, Promise<void>>();

  constructor(
    private readonly fileManager: FrontmatterFileManager,
    private readonly getRules: () => readonly ScopedEnumRule[],
  ) {}

  update(file: TFile, property: string, value: string): Promise<void> {
    const requestKey = `${file.path}\u0000${property}\u0000${value}`;
    const duplicate = this.pending.get(requestKey);
    if (duplicate) return duplicate;

    const previous = this.queues.get(file.path) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(async () => {
        await this.fileManager.processFrontMatter(file, (frontmatter) => {
          const rule = matchRule(
            this.getRules(),
            file.path,
            frontmatter.type,
            property,
          );
          if (!rule) {
            throw new ScopedEnumUpdateError(
              "The file no longer matches exactly one enum rule.",
            );
          }
          const caseConflict = Object.keys(frontmatter).find(
            (key) => key !== property && key.toLowerCase() === property.toLowerCase(),
          );
          if (caseConflict) {
            throw new ScopedEnumUpdateError(
              `A differently-cased property named ${caseConflict} already exists.`,
            );
          }
          if (!rule.values.includes(value)) {
            throw new ScopedEnumUpdateError(
              "The selected value is no longer allowed by the current rule.",
            );
          }
          frontmatter[property] = value;
        });
      });

    this.queues.set(file.path, task);
    this.pending.set(requestKey, task);
    const cleanup = (): void => {
      if (this.queues.get(file.path) === task) this.queues.delete(file.path);
      if (this.pending.get(requestKey) === task) this.pending.delete(requestKey);
    };
    void task.then(cleanup, cleanup);
    return task;
  }
}
