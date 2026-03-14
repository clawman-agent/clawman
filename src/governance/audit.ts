// Clawman Governance — Audit log
// JSONL append-only audit trail stored at ~/.clawman/governance/audit/YYYY-MM-DD.jsonl

import fs from "node:fs/promises";
import path from "node:path";
import { createAsyncLock } from "../infra/json-files.js";
import { getGovernanceDir } from "./store.js";
import type { AuditEntry } from "./types.js";

const lock = createAsyncLock();

function auditDir(): string {
  return path.join(getGovernanceDir(), "audit");
}

function auditFilePath(date: string): string {
  return path.join(auditDir(), `${date}.jsonl`);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Append a single audit entry to today's JSONL file.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  await lock(async () => {
    const dir = auditDir();
    await fs.mkdir(dir, { recursive: true });
    const filePath = auditFilePath(todayDate());
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(filePath, line, "utf8");
  });
}

export type AuditQueryParams = {
  memberId?: string;
  startDate?: string;
  endDate?: string;
  action?: string;
  limit?: number;
  offset?: number;
};

/**
 * Query audit entries across date-range files with optional filters.
 */
export async function queryAudit(params: AuditQueryParams = {}): Promise<AuditEntry[]> {
  const start = params.startDate ?? "2000-01-01";
  const end = params.endDate ?? "9999-12-31";
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  const dir = auditDir();
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  // Filter to .jsonl files within date range, sorted descending (newest first)
  const dateFiles = files
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => f.replace(".jsonl", ""))
    .filter((d) => d >= start && d <= end)
    .toSorted((a, b) => b.localeCompare(a));

  const results: AuditEntry[] = [];
  let skipped = 0;

  for (const dateStr of dateFiles) {
    if (results.length >= limit) {
      break;
    }

    const filePath = auditFilePath(dateStr);
    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    // Parse lines in reverse order (newest first within file)
    const lines = content.trim().split("\n").filter(Boolean).toReversed();
    for (const line of lines) {
      if (results.length >= limit) {
        break;
      }

      let entry: AuditEntry;
      try {
        entry = JSON.parse(line) as AuditEntry;
      } catch {
        continue;
      }

      // Apply filters
      if (params.memberId && entry.memberId !== params.memberId) {
        continue;
      }
      if (params.action && entry.action !== params.action) {
        continue;
      }

      // Apply offset
      if (skipped < offset) {
        skipped++;
        continue;
      }

      results.push(entry);
    }
  }

  return results;
}

/**
 * Get audit entry count (for pagination).
 */
export async function countAuditEntries(
  params: Omit<AuditQueryParams, "limit" | "offset"> = {},
): Promise<number> {
  const entries = await queryAudit({ ...params, limit: Number.MAX_SAFE_INTEGER, offset: 0 });
  return entries.length;
}
