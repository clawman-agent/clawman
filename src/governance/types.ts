// Clawman Governance — Core type definitions

/** Member role within the organization. */
export type MemberRole = "admin" | "member" | "viewer";

/** Memory scope for governance-aware memory isolation. */
export type MemoryScope = "personal" | "org";

/** Channel binding: maps channel type to user identifier on that channel. */
export type ChannelBindings = Record<string, string>;

/** Organization definition. */
export type Organization = {
  id: string;
  name: string;
  createdAt: string;
};

/** Organization member. */
export type Member = {
  id: string;
  name: string;
  role: MemberRole;
  channelBindings: ChannelBindings;
  /** Per-member tool denylist (merged with role-level denylist). */
  toolDenylist?: string[];
  /** Per-member agent allowlist override. */
  agentAllowlist?: string[];
  /** Per-member monthly budget override (USD). */
  monthlyBudget?: number;
  createdAt: string;
  updatedAt: string;
};

/** Audit log entry persisted as JSONL. */
export type AuditEntry = {
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

/** Monthly usage summary per member. */
export type UsageSummary = {
  memberId: string;
  month: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  lastUpdated: string;
};

/** Usage file: keyed by memberId. */
export type UsageFile = Record<string, UsageSummary>;

/** Execution node definition for multi-node topology. */
export type ExecutionNode = {
  id: string;
  name: string;
  /** "local" for same-process, or a WebSocket URL. */
  endpoint: string;
  /** Which agents run on this node. */
  agentIds: string[];
  /** Optional tags for routing hints. */
  tags?: string[];
};

/** Role-level policy. */
export type RolePolicy = {
  toolDenylist?: string[];
  agentAllowlist?: string[];
  /** Monthly budget cap in USD. null = unlimited. */
  monthlyBudget?: number | null;
};

/** Governance agent entry in config (maps agents to nodes). */
export type GovernanceAgentConfig = {
  id: string;
  nodeId: string;
  /** Display label for the agent in governance UI. */
  label?: string;
};

/** Top-level governance configuration block. */
export type ClawmanGovernanceConfig = {
  enabled?: boolean;
  organization?: {
    id?: string;
    name?: string;
  };
  roles?: Record<MemberRole, RolePolicy>;
  audit?: {
    enabled?: boolean;
    retentionDays?: number;
  };
  memory?: {
    defaultScope?: MemoryScope;
  };
  nodes?: ExecutionNode[];
  agents?: GovernanceAgentConfig[];
  /** Control plane configuration. When set, governance data is fetched from the central gateway. */
  controlPlane?: {
    url: string;
    token: string;
  };
};

/** Result of a policy check. */
export type PolicyCheckResult = {
  allowed: boolean;
  reason?: string;
};

/** Budget check result. */
export type BudgetCheckResult = {
  allowed: boolean;
  remaining: number | null;
  used: number;
  limit: number | null;
};

/** Resolved member with effective policy after role merge. */
export type ResolvedMemberPolicy = {
  member: Member;
  effectiveToolDenylist: string[];
  effectiveAgentAllowlist: string[] | null;
  effectiveBudget: number | null;
};
