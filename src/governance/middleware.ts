// Clawman Governance — Middleware
// Combines identity resolution, policy checks, and audit recording into a single guard.

import { recordAudit } from "./audit.js";
import { resolveMember, resolveEffectivePolicy } from "./identity.js";
import { checkAgentAccess, checkBudget } from "./policy.js";
import { incrementUsage, loadMembers } from "./store.js";
import type { AuditEntry, ClawmanGovernanceConfig, Member } from "./types.js";

export type GovernanceGuardParams = {
  channelType: string;
  channelUserId: string;
  agentId: string;
  config: ClawmanGovernanceConfig;
};

export type GovernanceGuardResult = {
  allowed: boolean;
  reason?: string;
  member?: Member;
  toolDenylist?: string[];
};

/**
 * Single entry point for governance checks before agent execution.
 * 1. Resolve member identity
 * 2. Check agent access
 * 3. Check budget
 * Returns the resolved member and whether execution is allowed.
 */
export async function governanceGuard(
  params: GovernanceGuardParams,
): Promise<GovernanceGuardResult> {
  if (!params.config.enabled) {
    return { allowed: true };
  }

  const members = await loadMembers();
  const member = resolveMember(params.channelType, params.channelUserId, members);

  if (!member) {
    return {
      allowed: false,
      reason: `No governance member found for ${params.channelType}:${params.channelUserId}`,
    };
  }

  // Check agent access
  const accessResult = checkAgentAccess(member, params.agentId, params.config);
  if (!accessResult.allowed) {
    await recordGovernanceAudit({
      member,
      action: "agent.access.denied",
      agentId: params.agentId,
      channel: params.channelType,
      detail: { reason: accessResult.reason },
    });
    return { allowed: false, reason: accessResult.reason, member };
  }

  // Check budget
  const budgetResult = await checkBudget(member, params.config);
  if (!budgetResult.allowed) {
    await recordGovernanceAudit({
      member,
      action: "budget.exceeded",
      agentId: params.agentId,
      channel: params.channelType,
      detail: {
        used: budgetResult.used,
        limit: budgetResult.limit,
        remaining: budgetResult.remaining,
      },
    });
    return {
      allowed: false,
      reason: `Monthly budget exceeded (used: $${budgetResult.used.toFixed(2)}, limit: $${budgetResult.limit?.toFixed(2)})`,
      member,
    };
  }

  // Get effective tool denylist
  const resolved = resolveEffectivePolicy(member, params.config);

  return {
    allowed: true,
    member,
    toolDenylist: resolved.effectiveToolDenylist,
  };
}

export type RecordGovernanceAuditParams = {
  member: Member;
  action: string;
  agentId?: string;
  channel?: string;
  detail?: Record<string, unknown>;
  durationMs?: number;
  tokenCount?: number;
  cost?: number;
};

/**
 * Record a governance audit entry and optionally increment usage counters.
 */
export async function recordGovernanceAudit(params: RecordGovernanceAuditParams): Promise<void> {
  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    memberId: params.member.id,
    memberName: params.member.name,
    action: params.action,
    agentId: params.agentId,
    channel: params.channel,
    detail: params.detail,
    durationMs: params.durationMs,
    tokenCount: params.tokenCount,
    cost: params.cost,
  };

  await recordAudit(entry);

  // If we have token/cost data, also increment the usage counter
  if (params.tokenCount || params.cost) {
    await incrementUsage(params.member.id, params.tokenCount ?? 0, params.cost ?? 0);
  }
}
