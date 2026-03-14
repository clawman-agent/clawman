// Clawman Governance — CLI commands
// Usage: openclaw governance member add/list/remove, openclaw governance node list

import type { Command } from "commander";
import { createMember, loadMembers, removeMember, saveMember } from "./store.js";
import type { MemberRole } from "./types.js";

export function registerGovernanceCli(program: Command) {
  const gov = program
    .command("governance")
    .description("Clawman governance: manage members, nodes, and policies")
    .aliases(["gov"]);

  const member = gov.command("member").description("Manage organization members");

  member
    .command("add <name>")
    .description("Add a new member")
    .requiredOption("--role <role>", "Member role (admin, member, viewer)")
    .option("--telegram <id>", "Telegram user ID binding")
    .option("--slack <id>", "Slack user ID binding")
    .option("--discord <id>", "Discord user ID binding")
    .option("--budget <amount>", "Monthly budget limit in USD", parseFloat)
    .action(async (name: string, opts: Record<string, string | number | undefined>) => {
      const channelBindings: Record<string, string> = {};
      if (opts.telegram) {
        channelBindings.telegram = String(opts.telegram);
      }
      if (opts.slack) {
        channelBindings.slack = String(opts.slack);
      }
      if (opts.discord) {
        channelBindings.discord = String(opts.discord);
      }

      const memberObj = createMember({
        name,
        role: opts.role as MemberRole,
        channelBindings,
        monthlyBudget: opts.budget as number | undefined,
      });
      await saveMember(memberObj);
      console.log(`Member added: ${memberObj.name} (${memberObj.id}) role=${memberObj.role}`);
    });

  member
    .command("list")
    .description("List all members")
    .action(async () => {
      const members = await loadMembers();
      if (members.length === 0) {
        console.log("No members configured.");
        return;
      }
      for (const m of members) {
        const bindings = Object.entries(m.channelBindings)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        console.log(`${m.id}  ${m.name}  role=${m.role}  channels=[${bindings}]`);
      }
    });

  member
    .command("remove <id>")
    .description("Remove a member by ID")
    .action(async (id: string) => {
      const removed = await removeMember(id);
      if (removed) {
        console.log(`Member ${id} removed.`);
      } else {
        console.log(`Member ${id} not found.`);
        process.exitCode = 1;
      }
    });

  const node = gov.command("node").description("Manage execution nodes");

  node
    .command("list")
    .description("List configured execution nodes")
    .action(async () => {
      const { loadConfig } = await import("../config/config.js");
      const cfg = loadConfig();
      const nodes = cfg.governance?.nodes ?? [];
      if (nodes.length === 0) {
        console.log("No nodes configured.");
        return;
      }
      for (const n of nodes) {
        const agents = n.agentIds.join(", ");
        console.log(`${n.id}  ${n.name}  endpoint=${n.endpoint}  agents=[${agents}]`);
      }
    });
}
