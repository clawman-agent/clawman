// Clawman Governance — UI Controller
// Follows the controller pattern from controllers/agents.ts

import type { GatewayBrowserClient } from "../gateway.ts";

export type GovernanceMember = {
  id: string;
  name: string;
  role: string;
  channelBindings: Record<string, string>;
  toolDenylist?: string[];
  agentAllowlist?: string[];
  monthlyBudget?: number;
  createdAt: string;
  updatedAt: string;
};

export type GovernanceAuditEntry = {
  ts: string;
  memberId: string;
  memberName: string;
  action: string;
  agentId?: string;
  channel?: string;
  detail?: Record<string, unknown>;
  durationMs?: number;
  tokenCount?: number;
  cost?: number;
};

export type GovernanceUsageSummary = {
  memberId: string;
  month: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  lastUpdated: string;
};

export type GovernanceNode = {
  id: string;
  name: string;
  endpoint: string;
  agentIds: string[];
  tags?: string[];
};

export type GovernanceState = {
  client: GatewayBrowserClient | null;
  connected: boolean;
  governanceMembersLoading: boolean;
  governanceMembersError: string | null;
  governanceMembers: GovernanceMember[];
  governanceAuditLoading: boolean;
  governanceAuditError: string | null;
  governanceAuditEntries: GovernanceAuditEntry[];
  governanceUsageLoading: boolean;
  governanceUsageError: string | null;
  governanceUsage: Record<string, GovernanceUsageSummary>;
  governanceNodesLoading: boolean;
  governanceNodesError: string | null;
  governanceNodes: GovernanceNode[];
};

export async function loadGovernanceMembers(state: GovernanceState) {
  if (!state.client || !state.connected || state.governanceMembersLoading) {
    return;
  }
  state.governanceMembersLoading = true;
  state.governanceMembersError = null;
  try {
    const res = await state.client.request<{ members: GovernanceMember[] }>(
      "governance.members.list",
      {},
    );
    if (res) {
      state.governanceMembers = res.members;
    }
  } catch (err) {
    state.governanceMembersError = String(err);
  } finally {
    state.governanceMembersLoading = false;
  }
}

export async function addGovernanceMember(
  state: GovernanceState,
  member: Omit<GovernanceMember, "id" | "createdAt" | "updatedAt">,
) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("governance.members.add", member);
    await loadGovernanceMembers(state);
  } catch (err) {
    state.governanceMembersError = String(err);
  }
}

export async function updateGovernanceMember(
  state: GovernanceState,
  member: Partial<GovernanceMember> & { id: string },
) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("governance.members.update", member);
    await loadGovernanceMembers(state);
  } catch (err) {
    state.governanceMembersError = String(err);
  }
}

export async function removeGovernanceMember(state: GovernanceState, memberId: string) {
  if (!state.client || !state.connected) {
    return;
  }
  try {
    await state.client.request("governance.members.remove", { id: memberId });
    await loadGovernanceMembers(state);
  } catch (err) {
    state.governanceMembersError = String(err);
  }
}

export async function loadGovernanceAudit(
  state: GovernanceState,
  filters?: { memberId?: string; startDate?: string; endDate?: string; limit?: number },
) {
  if (!state.client || !state.connected || state.governanceAuditLoading) {
    return;
  }
  state.governanceAuditLoading = true;
  state.governanceAuditError = null;
  try {
    const res = await state.client.request<{ entries: GovernanceAuditEntry[] }>(
      "governance.audit.query",
      filters ?? {},
    );
    if (res) {
      state.governanceAuditEntries = res.entries;
    }
  } catch (err) {
    state.governanceAuditError = String(err);
  } finally {
    state.governanceAuditLoading = false;
  }
}

export async function loadGovernanceUsage(state: GovernanceState, month?: string) {
  if (!state.client || !state.connected || state.governanceUsageLoading) {
    return;
  }
  state.governanceUsageLoading = true;
  state.governanceUsageError = null;
  try {
    const res = await state.client.request<{ usage: Record<string, GovernanceUsageSummary> }>(
      "governance.usage.summary",
      { month },
    );
    if (res) {
      state.governanceUsage = res.usage;
    }
  } catch (err) {
    state.governanceUsageError = String(err);
  } finally {
    state.governanceUsageLoading = false;
  }
}

export async function loadGovernanceNodes(state: GovernanceState) {
  if (!state.client || !state.connected || state.governanceNodesLoading) {
    return;
  }
  state.governanceNodesLoading = true;
  state.governanceNodesError = null;
  try {
    const res = await state.client.request<{ nodes: GovernanceNode[] }>(
      "governance.nodes.list",
      {},
    );
    if (res) {
      state.governanceNodes = res.nodes;
    }
  } catch (err) {
    state.governanceNodesError = String(err);
  } finally {
    state.governanceNodesLoading = false;
  }
}
