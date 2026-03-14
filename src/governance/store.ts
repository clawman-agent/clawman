// Clawman Governance — JSON file store
// Storage directory: ~/.clawman/governance/ (separate from ~/.openclaw/)

import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { createAsyncLock, readJsonFile, writeJsonAtomic } from "../infra/json-files.js";
import type { Member, Organization, UsageFile, UsageSummary } from "./types.js";

const GOVERNANCE_DIR = path.join(os.homedir(), ".clawman", "governance");

const lock = createAsyncLock();

function resolveGovernancePath(...segments: string[]): string {
  return path.join(GOVERNANCE_DIR, ...segments);
}

// --- Organization ---

export async function loadOrganization(): Promise<Organization | null> {
  return readJsonFile<Organization>(resolveGovernancePath("org.json"));
}

export async function saveOrganization(org: Organization): Promise<void> {
  await lock(async () => {
    await writeJsonAtomic(resolveGovernancePath("org.json"), org);
  });
}

export async function ensureOrganization(
  defaults?: Partial<Pick<Organization, "name">>,
): Promise<Organization> {
  const existing = await loadOrganization();
  if (existing) {
    return existing;
  }
  const org: Organization = {
    id: randomUUID(),
    name: defaults?.name ?? "default",
    createdAt: new Date().toISOString(),
  };
  await saveOrganization(org);
  return org;
}

// --- Members ---

export async function loadMembers(): Promise<Member[]> {
  const data = await readJsonFile<Member[]>(resolveGovernancePath("members.json"));
  return data ?? [];
}

export async function saveMember(member: Member): Promise<void> {
  await lock(async () => {
    const members = await loadMembers();
    const idx = members.findIndex((m) => m.id === member.id);
    if (idx >= 0) {
      members[idx] = member;
    } else {
      members.push(member);
    }
    await writeJsonAtomic(resolveGovernancePath("members.json"), members);
  });
}

export async function removeMember(memberId: string): Promise<boolean> {
  return lock(async () => {
    const members = await loadMembers();
    const filtered = members.filter((m) => m.id !== memberId);
    if (filtered.length === members.length) {
      return false;
    }
    await writeJsonAtomic(resolveGovernancePath("members.json"), filtered);
    return true;
  });
}

export function createMember(params: {
  name: string;
  role: Member["role"];
  channelBindings: Member["channelBindings"];
  toolDenylist?: string[];
  agentAllowlist?: string[];
  monthlyBudget?: number;
}): Member {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: params.name,
    role: params.role,
    channelBindings: params.channelBindings,
    toolDenylist: params.toolDenylist,
    agentAllowlist: params.agentAllowlist,
    monthlyBudget: params.monthlyBudget,
    createdAt: now,
    updatedAt: now,
  };
}

// --- Usage ---

function usageFilePath(month: string): string {
  return resolveGovernancePath("usage", `${month}.json`);
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function loadUsageSummary(month?: string): Promise<UsageFile> {
  const m = month ?? currentMonth();
  const data = await readJsonFile<UsageFile>(usageFilePath(m));
  return data ?? {};
}

export async function incrementUsage(
  memberId: string,
  tokens: number,
  cost: number,
): Promise<UsageSummary> {
  return lock(async () => {
    const month = currentMonth();
    const usage = await loadUsageSummary(month);
    const existing = usage[memberId];
    const updated: UsageSummary = {
      memberId,
      month,
      totalTokens: (existing?.totalTokens ?? 0) + tokens,
      totalCost: (existing?.totalCost ?? 0) + cost,
      requestCount: (existing?.requestCount ?? 0) + 1,
      lastUpdated: new Date().toISOString(),
    };
    usage[memberId] = updated;
    await writeJsonAtomic(usageFilePath(month), usage);
    return updated;
  });
}

export async function getUsageSummary(
  memberId: string,
  month?: string,
): Promise<UsageSummary | null> {
  const usage = await loadUsageSummary(month);
  return usage[memberId] ?? null;
}

// --- Governance directory path (for external consumers) ---

export function getGovernanceDir(): string {
  return GOVERNANCE_DIR;
}
