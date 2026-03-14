// Clawman Governance — Module entry point

import type { GatewayRequestHandlers } from "../gateway/server-methods/types.js";
import { resolveMember } from "./identity.js";
import { governanceGuard, recordGovernanceAudit } from "./middleware.js";
import { getEffectiveToolDenylist } from "./policy.js";
import { loadMembers } from "./store.js";
import type { ClawmanGovernanceConfig, Member } from "./types.js";
import { createGovernanceWsHandlers } from "./ws-handlers.js";

export type GovernanceModule = {
  config: ClawmanGovernanceConfig;
  resolveMember: (channelType: string, channelUserId: string) => Promise<Member | null>;
  guard: typeof governanceGuard;
  audit: typeof recordGovernanceAudit;
  getToolDenylist: (member: Member) => string[];
  wsHandlers: GatewayRequestHandlers;
  reload: (config: ClawmanGovernanceConfig) => void;
};

/**
 * Initialize the governance module.
 * Returns a GovernanceModule with all capabilities wired up.
 */
export async function initGovernance(
  config: ClawmanGovernanceConfig | undefined,
): Promise<GovernanceModule | null> {
  if (!config) {
    return null;
  }
  // If governance config exists, default to enabled unless explicitly disabled
  if (config.enabled === false) {
    return null;
  }

  let currentConfig = config;

  const mod: GovernanceModule = {
    config: currentConfig,

    resolveMember: async (channelType: string, channelUserId: string) => {
      const members = await loadMembers();
      return resolveMember(channelType, channelUserId, members);
    },

    guard: governanceGuard,

    audit: recordGovernanceAudit,

    getToolDenylist: (member: Member) => {
      return getEffectiveToolDenylist(member, currentConfig);
    },

    wsHandlers: createGovernanceWsHandlers(() => currentConfig),

    reload: (nextConfig: ClawmanGovernanceConfig) => {
      currentConfig = nextConfig;
      mod.config = nextConfig;
    },
  };

  (globalThis as Record<string, unknown>)[GOVERNANCE_KEY] = mod;
  return mod;
}

// Use globalThis to survive bundler code-splitting across chunks
const GOVERNANCE_KEY = "__clawman_governance__" as const;

/** Get the active governance module (null if not initialized or disabled). */
export function getGovernance(): GovernanceModule | null {
  return (
    ((globalThis as Record<string, unknown>)[GOVERNANCE_KEY] as GovernanceModule | null) ?? null
  );
}

// Re-export key types and functions
export type { GovernanceGuardParams, GovernanceGuardResult } from "./middleware.js";
export type {
  AuditEntry,
  ClawmanGovernanceConfig,
  Member,
  MemberRole,
  PolicyCheckResult,
  UsageSummary,
} from "./types.js";
