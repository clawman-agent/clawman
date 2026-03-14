// Clawman Governance — Quota management
// Tracks per-member monthly usage and enforces budget limits.

import { resolveEffectivePolicy } from "./identity.js";
import { getUsageSummary, incrementUsage as storeIncrementUsage } from "./store.js";
import type { BudgetCheckResult, ClawmanGovernanceConfig, Member, UsageSummary } from "./types.js";

/**
 * Record token and cost usage for a member.
 */
export async function recordUsage(
  memberId: string,
  tokens: number,
  cost: number,
): Promise<UsageSummary> {
  return storeIncrementUsage(memberId, tokens, cost);
}

/**
 * Get usage summary for a member in a given month.
 */
export async function getMemberUsage(
  memberId: string,
  month?: string,
): Promise<UsageSummary | null> {
  return getUsageSummary(memberId, month);
}

/**
 * Check if a member's budget allows further usage.
 */
export async function checkBudgetAllowance(
  member: Member,
  config: ClawmanGovernanceConfig,
): Promise<BudgetCheckResult> {
  const resolved = resolveEffectivePolicy(member, config);

  if (resolved.effectiveBudget === null) {
    return { allowed: true, remaining: null, used: 0, limit: null };
  }

  const usage = await getUsageSummary(member.id);
  const used = usage?.totalCost ?? 0;
  const remaining = resolved.effectiveBudget - used;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    used,
    limit: resolved.effectiveBudget,
  };
}
