// Clawman Governance Tool — lets admins manage members via chat

import { Type } from "@sinclair/typebox";
import { stringEnum } from "../schema/typebox.js";
import {
  type AnyAgentTool,
  jsonResult,
  readStringParam,
  ToolAuthorizationError,
} from "./common.js";
import { callGatewayTool, type GatewayCallOptions, readGatewayCallOptions } from "./gateway.js";

const GOVERNANCE_ACTIONS = [
  "members.list",
  "members.add",
  "members.update",
  "members.remove",
  "audit.query",
  "usage.summary",
] as const;

const GovernanceToolSchema = Type.Object(
  {
    action: stringEnum([...GOVERNANCE_ACTIONS]),
    name: Type.Optional(Type.String({ description: "Member display name (for add/update)" })),
    member_id: Type.Optional(Type.String({ description: "Member ID (for update/remove)" })),
    role: Type.Optional(
      stringEnum(["admin", "member", "viewer"], {
        description: "Member role (for add/update)",
      }),
    ),
    channel_type: Type.Optional(
      Type.String({ description: 'Channel type for binding, e.g. "telegram", "slack"' }),
    ),
    channel_user_id: Type.Optional(
      Type.String({ description: "User ID on the channel (for add/update)" }),
    ),
    monthly_budget: Type.Optional(
      Type.Number({ description: "Monthly budget in USD (for add/update, null for unlimited)" }),
    ),
    start_date: Type.Optional(
      Type.String({ description: "Start date for audit query (YYYY-MM-DD)" }),
    ),
    end_date: Type.Optional(Type.String({ description: "End date for audit query (YYYY-MM-DD)" })),
    limit: Type.Optional(Type.Number({ description: "Max results to return" })),
  },
  { additionalProperties: false },
);

export type GovernanceToolOptions = GatewayCallOptions & {
  /** Current member info from governance context — used to enforce admin-only */
  currentMemberRole?: string;
};

export function createGovernanceTool(opts: GovernanceToolOptions): AnyAgentTool {
  return {
    label: "Governance",
    name: "governance",
    description: `Manage Clawman governance: members, audit logs, and usage.

Actions:
- members.list: List all registered members
- members.add: Add a new member (requires: name, role; optional: member_id, channel_type, channel_user_id, monthly_budget)
- members.update: Update an existing member (requires: member_id; optional: name, role, channel_type, channel_user_id, monthly_budget)
- members.remove: Remove a member (requires: member_id)
- audit.query: Query audit logs (optional: member_id, start_date, end_date, limit)
- usage.summary: Get usage summary (optional: member_id)

Only admins can use this tool.`,
    parameters: GovernanceToolSchema,
    execute: async (_toolCallId, args) => {
      const params = args as Record<string, unknown>;
      const action = readStringParam(params, "action", { required: true });
      const gateway = readGatewayCallOptions(opts);

      switch (action) {
        case "members.list": {
          const result = await callGatewayTool("governance.members.list", gateway);
          return jsonResult(result);
        }

        case "members.add": {
          const name = readStringParam(params, "name", { required: true });
          const role = readStringParam(params, "role") ?? "member";
          const memberId =
            readStringParam(params, "member_id") ?? name.toLowerCase().replace(/\s+/g, "-");
          const channelType = readStringParam(params, "channel_type");
          const channelUserId = readStringParam(params, "channel_user_id");
          const monthlyBudget = params.monthly_budget as number | undefined;

          const channelBindings: Record<string, string> = {};
          if (channelType && channelUserId) {
            channelBindings[channelType] = channelUserId;
          }

          const result = await callGatewayTool("governance.members.add", gateway, {
            id: memberId,
            name,
            role,
            channelBindings,
            monthlyBudget: monthlyBudget ?? undefined,
          });
          return jsonResult(result);
        }

        case "members.update": {
          const memberId = readStringParam(params, "member_id", { required: true });
          const patch: Record<string, unknown> = {};
          const name = readStringParam(params, "name");
          if (name) {
            patch.name = name;
          }
          const role = readStringParam(params, "role");
          if (role) {
            patch.role = role;
          }
          const channelType = readStringParam(params, "channel_type");
          const channelUserId = readStringParam(params, "channel_user_id");
          if (channelType && channelUserId) {
            patch.channelBindings = { [channelType]: channelUserId };
          }
          if (params.monthly_budget !== undefined) {
            patch.monthlyBudget = params.monthly_budget;
          }
          const result = await callGatewayTool("governance.members.update", gateway, {
            id: memberId,
            ...patch,
          });
          return jsonResult(result);
        }

        case "members.remove": {
          const memberId = readStringParam(params, "member_id", { required: true });
          const result = await callGatewayTool("governance.members.remove", gateway, {
            id: memberId,
          });
          return jsonResult(result);
        }

        case "audit.query": {
          const memberId = readStringParam(params, "member_id");
          const startDate = readStringParam(params, "start_date");
          const endDate = readStringParam(params, "end_date");
          const limit = params.limit as number | undefined;
          const result = await callGatewayTool("governance.audit.query", gateway, {
            memberId,
            startDate,
            endDate,
            limit: limit ?? 50,
          });
          return jsonResult(result);
        }

        case "usage.summary": {
          const memberId = readStringParam(params, "member_id");
          const result = await callGatewayTool("governance.usage.summary", gateway, {
            memberId,
          });
          return jsonResult(result);
        }

        default:
          throw new ToolAuthorizationError(`Unknown governance action: ${action}`);
      }
    },
  };
}
