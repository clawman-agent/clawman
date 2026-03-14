// Clawman Governance — Policy engine
// Enforces role-based access control, agent allowlists, tool denylists, and budgets.

import { resolveEffectivePolicy } from "./identity.js";
import { getUsageSummary } from "./store.js";
import type {
  BudgetCheckResult,
  ClawmanGovernanceConfig,
  Member,
  PolicyCheckResult,
  ResolvedMemberPolicy,
} from "./types.js";

/**
 * Check if a member is allowed to access a specific agent.
 * - viewer: always denied
 * - admin: always allowed
 * - member: checked against effectiveAgentAllowlist
 */
export function checkAgentAccess(
  member: Member,
  agentId: string,
  config: ClawmanGovernanceConfig,
): PolicyCheckResult {
  if (member.role === "viewer") {
    return { allowed: false, reason: "Viewers cannot run agents" };
  }

  if (member.role === "admin") {
    return { allowed: true };
  }

  // member role: check allowlist
  const resolved = resolveEffectivePolicy(member, config);
  if (resolved.effectiveAgentAllowlist === null || resolved.effectiveAgentAllowlist.includes("*")) {
    // No allowlist or wildcard = all agents allowed
    return { allowed: true };
  }

  if (resolved.effectiveAgentAllowlist.includes(agentId)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Agent "${agentId}" is not in the allowlist for member "${member.name}"`,
  };
}

/**
 * Filter tools by removing denied tools based on role and member policy.
 */
export function filterToolsByPolicy<T extends { name: string }>(
  tools: T[],
  member: Member,
  config: ClawmanGovernanceConfig,
): T[] {
  const resolved = resolveEffectivePolicy(member, config);
  if (resolved.effectiveToolDenylist.length === 0) {
    return tools;
  }

  const denySet = new Set(resolved.effectiveToolDenylist);
  return tools.filter((tool) => !denySet.has(tool.name));
}

/**
 * Get the effective tool denylist for a member.
 */
export function getEffectiveToolDenylist(
  member: Member,
  config: ClawmanGovernanceConfig,
): string[] {
  const resolved = resolveEffectivePolicy(member, config);
  return resolved.effectiveToolDenylist;
}

/**
 * Check if a member is within their monthly budget.
 */
export async function checkBudget(
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

/**
 * Resolve a member's full effective policy.
 */
export function resolveMemberPolicy(
  member: Member,
  config: ClawmanGovernanceConfig,
): ResolvedMemberPolicy {
  return resolveEffectivePolicy(member, config);
}
