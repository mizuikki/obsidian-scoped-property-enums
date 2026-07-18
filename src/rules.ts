export const SETTINGS_SCHEMA_VERSION = 1 as const;

export interface ScopedEnumRule {
  folders: string[];
  type: string;
  property: string;
  values: string[];
}

export interface ScopedPropertyEnumsSettings {
  schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
  enumRules: ScopedEnumRule[];
}

export interface ConfigurationError {
  path: string;
  message: string;
}

export interface ValidatedSettings {
  raw: unknown;
  rules: ScopedEnumRule[];
  errors: ConfigurationError[];
  supportedVersion: boolean;
}

export const DEFAULT_SETTINGS: ScopedPropertyEnumsSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  enumRules: [
    {
      folders: ["05-Proposals"],
      type: "proposal",
      property: "status",
      values: [
        "draft",
        "under-review",
        "approved",
        "rejected",
        "withdrawn",
      ],
    },
    {
      folders: ["10-Projects", "90-Archive/Projects"],
      type: "project",
      property: "status",
      values: ["active", "on-hold", "completed", "archived"],
    },
    {
      folders: ["12-ADR"],
      type: "adr",
      property: "status",
      values: ["proposed", "accepted", "deprecated", "superseded"],
    },
    {
      folders: ["11-Project-Notes"],
      type: "project-note",
      property: "note_kind",
      values: ["meeting", "experiment", "debug", "research", "review"],
    },
  ],
};

export function cloneDefaultSettings(): ScopedPropertyEnumsSettings {
  return structuredClone(DEFAULT_SETTINGS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateExactString(
  value: unknown,
  path: string,
  errors: ConfigurationError[],
): value is string {
  if (typeof value !== "string" || value.length === 0) {
    errors.push({ path, message: "Must be a non-empty string." });
    return false;
  }
  if (value.trim() !== value) {
    errors.push({ path, message: "Must not have leading or trailing whitespace." });
    return false;
  }
  return true;
}

function isVaultFolder(folder: string): boolean {
  if (
    folder.startsWith("/") ||
    folder.endsWith("/") ||
    folder.includes("\\") ||
    folder.includes("//")
  ) {
    return false;
  }
  return folder.split("/").every((part) => part !== "." && part !== "..");
}

function validateStringList(
  value: unknown,
  path: string,
  errors: ConfigurationError[],
  validateItem?: (item: string) => boolean,
): value is string[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push({ path, message: "Must be a non-empty array." });
    return false;
  }

  let valid = true;
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!validateExactString(item, itemPath, errors)) {
      valid = false;
      return;
    }
    if (seen.has(item)) {
      errors.push({ path: itemPath, message: `Duplicate value: ${item}` });
      valid = false;
    }
    seen.add(item);
    if (validateItem && !validateItem(item)) {
      errors.push({
        path: itemPath,
        message: "Must be a normalized vault-relative POSIX folder path.",
      });
      valid = false;
    }
  });
  return valid;
}

function validateRule(
  value: unknown,
  index: number,
  errors: ConfigurationError[],
): ScopedEnumRule | null {
  const base = `enumRules[${index}]`;
  if (!isRecord(value)) {
    errors.push({ path: base, message: "Must be an object." });
    return null;
  }

  const before = errors.length;
  for (const key of Object.keys(value)) {
    if (!["folders", "type", "property", "values"].includes(key)) {
      errors.push({ path: `${base}.${key}`, message: "Unknown rule field." });
    }
  }
  validateStringList(value.folders, `${base}.folders`, errors, isVaultFolder);
  validateExactString(value.type, `${base}.type`, errors);
  validateExactString(value.property, `${base}.property`, errors);
  validateStringList(value.values, `${base}.values`, errors);
  if (Array.isArray(value.folders) && value.folders.every((item) => typeof item === "string")) {
    for (let left = 0; left < value.folders.length; left += 1) {
      for (let right = left + 1; right < value.folders.length; right += 1) {
        if (foldersOverlap(value.folders[left], value.folders[right])) {
          errors.push({
            path: `${base}.folders[${right}]`,
            message: `Scope overlaps folders[${left}] in the same rule.`,
          });
        }
      }
    }
  }
  if (errors.length !== before) return null;

  return {
    folders: [...(value.folders as string[])],
    type: value.type as string,
    property: value.property as string,
    values: [...(value.values as string[])],
  };
}

export function folderContains(folder: string, filePath: string): boolean {
  return filePath.startsWith(`${folder}/`);
}

function foldersOverlap(left: string, right: string): boolean {
  return (
    left === right ||
    left.startsWith(`${right}/`) ||
    right.startsWith(`${left}/`)
  );
}

export function validateSettings(raw: unknown): ValidatedSettings {
  if (!isRecord(raw)) {
    return {
      raw,
      rules: [],
      errors: [{ path: "$", message: "Settings must be an object." }],
      supportedVersion: true,
    };
  }
  if (raw.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    return {
      raw,
      rules: [],
      errors: [
        {
          path: "schemaVersion",
          message: `Unsupported settings schema version: ${String(raw.schemaVersion)}`,
        },
      ],
      supportedVersion: false,
    };
  }
  if (!Array.isArray(raw.enumRules)) {
    return {
      raw,
      rules: [],
      errors: [{ path: "enumRules", message: "Must be an array." }],
      supportedVersion: true,
    };
  }

  const errors: ConfigurationError[] = [];
  for (const key of Object.keys(raw)) {
    if (!["schemaVersion", "enumRules"].includes(key)) {
      errors.push({ path: key, message: "Unknown settings field." });
    }
  }
  const candidates = raw.enumRules.map((rule, index) =>
    validateRule(rule, index, errors),
  );
  const invalidForOverlap = new Set<number>();

  for (let left = 0; left < candidates.length; left += 1) {
    const leftRule = candidates[left];
    if (!leftRule) continue;
    for (let right = left + 1; right < candidates.length; right += 1) {
      const rightRule = candidates[right];
      if (
        !rightRule ||
        leftRule.type !== rightRule.type ||
        leftRule.property !== rightRule.property
      ) {
        continue;
      }
      const overlap = leftRule.folders.some((leftFolder) =>
        rightRule.folders.some((rightFolder) =>
          foldersOverlap(leftFolder, rightFolder),
        ),
      );
      if (overlap) {
        invalidForOverlap.add(left);
        invalidForOverlap.add(right);
        errors.push({
          path: `enumRules[${right}]`,
          message: `Scope overlaps enumRules[${left}] for the same type and property.`,
        });
      }
    }
  }

  return {
    raw,
    rules: candidates.flatMap((rule, index) =>
      rule && !invalidForOverlap.has(index) ? [rule] : [],
    ),
    errors,
    supportedVersion: true,
  };
}

export function matchRule(
  rules: readonly ScopedEnumRule[],
  filePath: string,
  type: unknown,
  property: string,
): ScopedEnumRule | null {
  if (typeof type !== "string") return null;
  const matches = rules.filter(
    (rule) =>
      rule.type === type &&
      rule.property === property &&
      rule.folders.some((folder) => folderContains(folder, filePath)),
  );
  return matches.length === 1 ? matches[0] : null;
}
