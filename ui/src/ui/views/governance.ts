// Clawman Governance — UI View
// Pure render functions following the props-driven pattern from views/agents.ts

import { html, nothing } from "lit";
import type {
  GovernanceAuditEntry,
  GovernanceMember,
  GovernanceNode,
  GovernanceUsageSummary,
} from "../controllers/governance.ts";

export type GovernanceProps = {
  membersLoading: boolean;
  membersError: string | null;
  members: GovernanceMember[];
  auditLoading: boolean;
  auditError: string | null;
  auditEntries: GovernanceAuditEntry[];
  usageLoading: boolean;
  usageError: string | null;
  usage: Record<string, GovernanceUsageSummary>;
  nodesLoading: boolean;
  nodesError: string | null;
  nodes: GovernanceNode[];
  onRefreshMembers: () => void;
  onRefreshAudit: () => void;
  onRefreshUsage: () => void;
  onRefreshNodes: () => void;
  onRemoveMember: (id: string) => void;
};

export function renderGovernance(props: GovernanceProps) {
  return html`
    <div class="governance-layout" style="padding: 1rem; display: flex; flex-direction: column; gap: 1.5rem;">
      <h2 style="margin: 0; font-size: 1.25rem;">Governance</h2>
      ${renderMembersSection(props)}
      ${renderNodesSection(props)}
      ${renderAuditSection(props)}
      ${renderUsageSection(props)}
    </div>
  `;
}

function renderMembersSection(props: GovernanceProps) {
  return html`
    <section class="governance-section">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1rem;">Members</h3>
        <button @click=${props.onRefreshMembers} style="font-size: 0.75rem; cursor: pointer;">
          Refresh
        </button>
      </div>
      ${
        props.membersLoading
          ? html`
              <p>Loading...</p>
            `
          : nothing
      }
      ${props.membersError ? html`<p style="color: var(--color-error, red);">${props.membersError}</p>` : nothing}
      ${
        !props.membersLoading && props.members.length === 0
          ? html`
              <p style="opacity: 0.6">No members configured. Use CLI to add members.</p>
            `
          : nothing
      }
      ${
        props.members.length > 0
          ? html`
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid var(--color-border, #333);">
                  <th style="padding: 0.25rem 0.5rem;">Name</th>
                  <th style="padding: 0.25rem 0.5rem;">Role</th>
                  <th style="padding: 0.25rem 0.5rem;">Channels</th>
                  <th style="padding: 0.25rem 0.5rem;">Budget</th>
                  <th style="padding: 0.25rem 0.5rem;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${props.members.map(
                  (m) => html`
                    <tr style="border-bottom: 1px solid var(--color-border, #222);">
                      <td style="padding: 0.25rem 0.5rem;">${m.name}</td>
                      <td style="padding: 0.25rem 0.5rem;">
                        <span style="
                          padding: 0.1rem 0.4rem;
                          border-radius: 0.25rem;
                          font-size: 0.75rem;
                          background: ${m.role === "admin" ? "var(--color-accent, #4a9)" : m.role === "viewer" ? "var(--color-warning, #a94)" : "var(--color-secondary, #49a)"};
                          color: #fff;
                        ">${m.role}</span>
                      </td>
                      <td style="padding: 0.25rem 0.5rem; font-size: 0.8rem; opacity: 0.8;">
                        ${
                          Object.entries(m.channelBindings)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ") || "none"
                        }
                      </td>
                      <td style="padding: 0.25rem 0.5rem;">
                        ${m.monthlyBudget != null ? `$${m.monthlyBudget}` : "unlimited"}
                      </td>
                      <td style="padding: 0.25rem 0.5rem;">
                        <button
                          @click=${() => props.onRemoveMember(m.id)}
                          style="font-size: 0.75rem; cursor: pointer; color: var(--color-error, red);"
                        >Remove</button>
                      </td>
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          `
          : nothing
      }
    </section>
  `;
}

function renderNodesSection(props: GovernanceProps) {
  return html`
    <section class="governance-section">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1rem;">Execution Nodes</h3>
        <button @click=${props.onRefreshNodes} style="font-size: 0.75rem; cursor: pointer;">
          Refresh
        </button>
      </div>
      ${
        props.nodesLoading
          ? html`
              <p>Loading...</p>
            `
          : nothing
      }
      ${props.nodesError ? html`<p style="color: var(--color-error, red);">${props.nodesError}</p>` : nothing}
      ${
        !props.nodesLoading && props.nodes.length === 0
          ? html`
              <p style="opacity: 0.6">No nodes configured.</p>
            `
          : nothing
      }
      ${
        props.nodes.length > 0
          ? html`
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid var(--color-border, #333);">
                  <th style="padding: 0.25rem 0.5rem;">Name</th>
                  <th style="padding: 0.25rem 0.5rem;">Endpoint</th>
                  <th style="padding: 0.25rem 0.5rem;">Agents</th>
                </tr>
              </thead>
              <tbody>
                ${props.nodes.map(
                  (n) => html`
                    <tr style="border-bottom: 1px solid var(--color-border, #222);">
                      <td style="padding: 0.25rem 0.5rem;">${n.name}</td>
                      <td style="padding: 0.25rem 0.5rem; font-size: 0.8rem; opacity: 0.8;">
                        ${n.endpoint === "local" ? "local" : n.endpoint}
                      </td>
                      <td style="padding: 0.25rem 0.5rem;">${n.agentIds.join(", ")}</td>
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          `
          : nothing
      }
    </section>
  `;
}

function renderAuditSection(props: GovernanceProps) {
  return html`
    <section class="governance-section">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1rem;">Audit Log</h3>
        <button @click=${props.onRefreshAudit} style="font-size: 0.75rem; cursor: pointer;">
          Refresh
        </button>
      </div>
      ${
        props.auditLoading
          ? html`
              <p>Loading...</p>
            `
          : nothing
      }
      ${props.auditError ? html`<p style="color: var(--color-error, red);">${props.auditError}</p>` : nothing}
      ${
        !props.auditLoading && props.auditEntries.length === 0
          ? html`
              <p style="opacity: 0.6">No audit entries.</p>
            `
          : nothing
      }
      ${
        props.auditEntries.length > 0
          ? html`
            <div style="max-height: 300px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                <thead>
                  <tr style="text-align: left; border-bottom: 1px solid var(--color-border, #333);">
                    <th style="padding: 0.25rem 0.5rem;">Time</th>
                    <th style="padding: 0.25rem 0.5rem;">Member</th>
                    <th style="padding: 0.25rem 0.5rem;">Action</th>
                    <th style="padding: 0.25rem 0.5rem;">Agent</th>
                    <th style="padding: 0.25rem 0.5rem;">Channel</th>
                  </tr>
                </thead>
                <tbody>
                  ${props.auditEntries.slice(0, 50).map(
                    (e) => html`
                      <tr style="border-bottom: 1px solid var(--color-border, #222);">
                        <td style="padding: 0.25rem 0.5rem; white-space: nowrap;">${formatTimestamp(e.ts)}</td>
                        <td style="padding: 0.25rem 0.5rem;">${e.memberName}</td>
                        <td style="padding: 0.25rem 0.5rem;">${e.action}</td>
                        <td style="padding: 0.25rem 0.5rem;">${e.agentId ?? "-"}</td>
                        <td style="padding: 0.25rem 0.5rem;">${e.channel ?? "-"}</td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            </div>
          `
          : nothing
      }
    </section>
  `;
}

function renderUsageSection(props: GovernanceProps) {
  const entries = Object.values(props.usage);
  return html`
    <section class="governance-section">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <h3 style="margin: 0; font-size: 1rem;">Usage</h3>
        <button @click=${props.onRefreshUsage} style="font-size: 0.75rem; cursor: pointer;">
          Refresh
        </button>
      </div>
      ${
        props.usageLoading
          ? html`
              <p>Loading...</p>
            `
          : nothing
      }
      ${props.usageError ? html`<p style="color: var(--color-error, red);">${props.usageError}</p>` : nothing}
      ${
        !props.usageLoading && entries.length === 0
          ? html`
              <p style="opacity: 0.6">No usage data.</p>
            `
          : nothing
      }
      ${
        entries.length > 0
          ? html`
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="text-align: left; border-bottom: 1px solid var(--color-border, #333);">
                  <th style="padding: 0.25rem 0.5rem;">Member</th>
                  <th style="padding: 0.25rem 0.5rem;">Requests</th>
                  <th style="padding: 0.25rem 0.5rem;">Tokens</th>
                  <th style="padding: 0.25rem 0.5rem;">Cost</th>
                  <th style="padding: 0.25rem 0.5rem;">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map(
                  (u) => html`
                    <tr style="border-bottom: 1px solid var(--color-border, #222);">
                      <td style="padding: 0.25rem 0.5rem;">${u.memberId}</td>
                      <td style="padding: 0.25rem 0.5rem;">${u.requestCount}</td>
                      <td style="padding: 0.25rem 0.5rem;">${u.totalTokens.toLocaleString()}</td>
                      <td style="padding: 0.25rem 0.5rem;">$${u.totalCost.toFixed(4)}</td>
                      <td style="padding: 0.25rem 0.5rem;">${formatTimestamp(u.lastUpdated)}</td>
                    </tr>
                  `,
                )}
              </tbody>
            </table>
          `
          : nothing
      }
    </section>
  `;
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return ts;
  }
}
