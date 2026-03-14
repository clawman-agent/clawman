// Clawman Governance — WebSocket RPC handlers
// Follows the GatewayRequestHandlers pattern from server-methods/types.ts

import type { GatewayRequestHandlers } from "../gateway/server-methods/types.js";
import { queryAudit } from "./audit.js";
import { resolveMemberById } from "./identity.js";
import { createMember, loadMembers, loadUsageSummary, removeMember, saveMember } from "./store.js";
import type { ClawmanGovernanceConfig, Member, MemberRole } from "./types.js";

type ConfigGetter = () => ClawmanGovernanceConfig;

/**
 * Create governance WebSocket RPC handlers.
 * These are merged into the gateway's extraHandlers.
 */
export function createGovernanceWsHandlers(getConfig: ConfigGetter): GatewayRequestHandlers {
  return {
    "governance.members.list": async ({ respond }) => {
      try {
        const members = await loadMembers();
        respond(true, { members });
      } catch (err) {
        respond(false, undefined, { code: "GOVERNANCE_ERROR", message: String(err) });
      }
    },

    "governance.members.add": async ({ params, respond }) => {
      try {
        const name = params.name as string;
        const role = (params.role as MemberRole) ?? "member";
        const channelBindings = (params.channelBindings as Record<string, string>) ?? {};
        const toolDenylist = params.toolDenylist as string[] | undefined;
        const agentAllowlist = params.agentAllowlist as string[] | undefined;
        const monthlyBudget = params.monthlyBudget as number | undefined;

        if (!name) {
          respond(false, undefined, { code: "INVALID_PARAMS", message: "name is required" });
          return;
        }

        const member = createMember({
          name,
          role,
          channelBindings,
          toolDenylist,
          agentAllowlist,
          monthlyBudget,
        });
        await saveMember(member);
        respond(true, { member });
      } catch (err) {
        respond(false, undefined, { code: "GOVERNANCE_ERROR", message: String(err) });
      }
    },

    "governance.members.update": async ({ params, respond }) => {
      try {
        const memberId = params.id as string;
        if (!memberId) {
          respond(false, undefined, { code: "INVALID_PARAMS", message: "id is required" });
          return;
        }

        const members = await loadMembers();
        const existing = resolveMemberById(memberId, members);
        if (!existing) {
          respond(false, undefined, { code: "NOT_FOUND", message: `Member ${memberId} not found` });
          return;
        }

        const updated: Member = {
          ...existing,
          name: (params.name as string) ?? existing.name,
          role: (params.role as MemberRole) ?? existing.role,
          channelBindings:
            (params.channelBindings as Record<string, string>) ?? existing.channelBindings,
          toolDenylist:
            params.toolDenylist !== undefined
              ? (params.toolDenylist as string[])
              : existing.toolDenylist,
          agentAllowlist:
            params.agentAllowlist !== undefined
              ? (params.agentAllowlist as string[])
              : existing.agentAllowlist,
          monthlyBudget:
            params.monthlyBudget !== undefined
              ? (params.monthlyBudget as number)
              : existing.monthlyBudget,
          updatedAt: new Date().toISOString(),
        };

        await saveMember(updated);
        respond(true, { member: updated });
      } catch (err) {
        respond(false, undefined, { code: "GOVERNANCE_ERROR", message: String(err) });
      }
    },

    "governance.members.remove": async ({ params, respond }) => {
      try {
        const memberId = params.id as string;
        if (!memberId) {
          respond(false, undefined, { code: "INVALID_PARAMS", message: "id is required" });
          return;
        }
        const removed = await removeMember(memberId);
        respond(true, { removed });
      } catch (err) {
        respond(false, undefined, { code: "GOVERNANCE_ERROR", message: String(err) });
      }
    },

    "governance.audit.query": async ({ params, respond }) => {
      try {
        const entries = await queryAudit({
          memberId: params.memberId as string | undefined,
          startDate: params.startDate as string | undefined,
          endDate: params.endDate as string | undefined,
          action: params.action as string | undefined,
          limit: params.limit as number | undefined,
          offset: params.offset as number | undefined,
        });
        respond(true, { entries });
      } catch (err) {
        respond(false, undefined, { code: "GOVERNANCE_ERROR", message: String(err) });
      }
    },

    "governance.usage.summary": async ({ params, respond }) => {
      try {
        const month = params.month as string | undefined;
        const usage = await loadUsageSummary(month);
        respond(true, { usage });
      } catch (err) {
        respond(false, undefined, { code: "GOVERNANCE_ERROR", message: String(err) });
      }
    },

    "governance.nodes.list": async ({ respond }) => {
      try {
        const config = getConfig();
        respond(true, { nodes: config.nodes ?? [] });
      } catch (err) {
        respond(false, undefined, { code: "GOVERNANCE_ERROR", message: String(err) });
      }
    },
  };
}
