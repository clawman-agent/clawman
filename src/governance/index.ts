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
  buildSystemPrompt: (currentMember?: Member | null) => Promise<string>;
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

    buildSystemPrompt: async (currentMember?: Member | null) => {
      const members = await loadMembers();
      return buildGovernanceSystemPrompt(currentConfig, members, currentMember);
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

/**
 * Build a system prompt that gives the agent team awareness.
 */
function buildGovernanceSystemPrompt(
  config: ClawmanGovernanceConfig,
  members: Member[],
  currentMember?: Member | null,
): string {
  const lines: string[] = [];

  lines.push("## Clawman Governance");
  lines.push("");
  lines.push(
    "You are part of a Clawman-managed agent team. You are not alone — there are other agents and human members in this organization.",
  );

  // Organization info
  if (config.organization?.name) {
    lines.push(`Organization: ${config.organization.name}`);
  }

  // Current user context
  if (currentMember) {
    lines.push(`Current user: ${currentMember.name} (role: ${currentMember.role})`);
  }

  // Team members (humans)
  if (members.length > 0) {
    lines.push("");
    lines.push("### Team Members (Humans)");
    for (const m of members) {
      const channels = Object.entries(m.channelBindings)
        .map(([ch, id]) => `${ch}:${id}`)
        .join(", ");
      lines.push(`- **${m.name}** (${m.role})${channels ? ` — channels: ${channels}` : ""}`);
    }
  }

  // Nodes & agents
  if (config.nodes && config.nodes.length > 0) {
    lines.push("");
    lines.push("### Agent Nodes");
    for (const node of config.nodes) {
      const agentList = node.agentIds.join(", ") || "default";
      lines.push(
        `- **${node.name}** (${node.id}) — agents: ${agentList}${node.tags?.length ? `, tags: ${node.tags.join(", ")}` : ""}`,
      );
    }
  }

  if (config.agents && config.agents.length > 0) {
    lines.push("");
    lines.push("### Registered Agents");
    for (const agent of config.agents) {
      lines.push(`- **${agent.label ?? agent.id}** (id: ${agent.id}, node: ${agent.nodeId})`);
    }
  }

  // Governance tool instructions
  lines.push("");
  lines.push("### Governance Tool");
  lines.push(
    "You have a `governance` tool. Use it when the user asks about members, audit, usage, or team management:",
  );
  lines.push('- "members.list" / "members.add" / "members.update" / "members.remove"');
  lines.push('- "audit.query" — query audit logs');
  lines.push('- "usage.summary" — usage statistics');
  lines.push("Keywords: 成员, member, 审计, audit, 用量, usage, 权限, permission");
  lines.push("Only admin members can manage other members.");

  // Team awareness
  lines.push("");
  lines.push("### Team Awareness");
  lines.push(
    "- You may receive requests that involve other agents. Use `sessions.send` to communicate with them when needed.",
  );
  lines.push("- When a task is better suited for another agent, suggest or delegate to them.");
  lines.push("- Always be aware: you are part of a team, not a standalone assistant.");

  return lines.join("\n");
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
