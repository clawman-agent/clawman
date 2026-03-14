// Clawman Governance — Identity resolution
// Maps channel-specific user IDs to governance Members.

import type { ClawmanGovernanceConfig, Member, ResolvedMemberPolicy, RolePolicy } from "./types.js";

/**
 * Resolve a Member from channel type and channel-specific user ID.
 * Returns null if no member matches.
 */
export function resolveMember(
  channelType: string,
  channelUserId: string,
  members: Member[],
): Member | null {
  if (!channelType || !channelUserId) {
    return null;
  }
  for (const member of members) {
    const bound = member.channelBindings[channelType];
    if (bound === channelUserId) {
      return member;
    }
  }
  return null;
}

/**
 * Resolve a member by their member ID.
 */
export function resolveMemberById(memberId: string, members: Member[]): Member | null {
  return members.find((m) => m.id === memberId) ?? null;
}

/**
 * Build a ResolvedMemberPolicy by merging role-level and member-level policies.
 */
export function resolveEffectivePolicy(
  member: Member,
  config: ClawmanGovernanceConfig,
): ResolvedMemberPolicy {
  const rolePolicy = getRolePolicy(member.role, config);

  // Merge tool denylists: role-level + member-level
  const roleTools = rolePolicy?.toolDenylist ?? [];
  const memberTools = member.toolDenylist ?? [];
  const effectiveToolDenylist = [...new Set([...roleTools, ...memberTools])];

  // Agent allowlist: member override takes precedence (if non-empty), then role-level, then null (all allowed)
  // Treat empty array as "not set" so role-level defaults apply
  const memberAllowlist = member.agentAllowlist?.length ? member.agentAllowlist : undefined;
  const roleAllowlist = rolePolicy?.agentAllowlist;
  const effectiveAgentAllowlist = memberAllowlist ?? roleAllowlist ?? null;

  // Budget: member override takes precedence, then role-level
  const effectiveBudget = member.monthlyBudget ?? rolePolicy?.monthlyBudget ?? null;

  return {
    member,
    effectiveToolDenylist,
    effectiveAgentAllowlist,
    effectiveBudget,
  };
}

/**
 * Get the RolePolicy for a given role.
 */
function getRolePolicy(
  role: Member["role"],
  config: ClawmanGovernanceConfig,
): RolePolicy | undefined {
  return config.roles?.[role];
}

/**
 * Check if a member has a specific channel binding.
 */
export function hasMemberChannelBinding(member: Member, channelType: string): boolean {
  return channelType in member.channelBindings;
}
