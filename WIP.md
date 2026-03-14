# Clawman WIP — Work In Progress

## Completed (2026-03-14)

### Governance Runtime

- [x] Config loading: merge `~/.clawman/config/clawman.json5` into gateway config
- [x] Member identity resolution (channel type + user ID → member)
- [x] Role-based access control (admin/member/viewer)
- [x] Unregistered users blocked when governance enabled
- [x] Audit logging (JSONL append, per-day files)
- [x] Usage tracking (token count per member)
- [x] Agent allowlist + tool denylist enforcement
- [x] Wildcard `["*"]` support in agent allowlist
- [x] Budget check (monthly cost limit per member)

### Governance Tool

- [x] `governance` agent tool — members CRUD, audit query, usage summary
- [x] Routed through gateway WS RPC (`governance.members.*`, `governance.audit.*`)
- [x] Registered in operator scope (ADMIN)

### Team Awareness

- [x] Dynamic system prompt with organization, members, nodes, agents info
- [x] Each agent knows it's part of a team (not standalone)

### Control Plane

- [x] `controlPlane` config option — worker nodes route governance API to central gateway
- [x] Member resolution + system prompt data fetched from control plane
- [x] Fallback to local data if control plane unreachable

### Deployment

- [x] Mac Mini: Clawman gateway via launchd (agent: `main`, MiniMax-M2.5)
- [x] GCP VM: Clawman gateway via systemd (agent: `gcp-001`, GLM-4.7)
- [x] Both with governance enabled, Telegram bots connected
- [x] GCP configured with Mac Mini as control plane

---

## WIP — In Progress

### Node Pairing (Inter-Agent Communication)

- [x] Tailscale connectivity verified (Mac Mini ↔ GCP)
- [x] Mac Mini gateway bound to Tailscale IP (`--bind lan`)
- [x] GCP `node run` token auth resolved (`OPENCLAW_GATEWAY_TOKEN` env var)
- [x] Pairing request created successfully (`reason: not-paired`)
- [ ] **Approve pairing request** — GCP VM too slow (45s+ startup), pairing request expires before approve. Need to either:
  - Upgrade GCP VM to e2-standard-2 (8GB RAM) for faster startup
  - Or write a startup script that auto-starts `node run` + auto-approves on Mac Mini
- [ ] **Verify node.invoke RPC** — after pairing, test cross-node task dispatch
- [ ] **Install as persistent service** — `openclaw node install` on GCP for auto-restart

### Inter-Agent Messaging

- [ ] After node pairing: agents can use `sessions.send` to message each other
- [ ] Add `message.send` action to governance tool for cross-agent communication
- [ ] Test: tell agent A something → agent A forwards to agent B → agent B confirms

### Mac Mini Agent Awareness

- [ ] MiniMax model doesn't display full team info from system prompt (shows only 1 agent)
- [ ] May need model-specific prompt tuning or switch to a more capable model
- [ ] Alternative: add agent list to governance tool response so model queries it explicitly

---

## Future

### Memory Isolation

- [ ] Personal memory scope per member (`~/.clawman/memory/personal/{memberId}/`)
- [ ] Org-level shared memory (`~/.clawman/memory/org/`)
- [ ] Governance-aware memory search

### UI Panel

- [ ] Governance tab in Control UI (members, audit, usage, nodes)
- [ ] `ui/src/ui/views/governance.ts` + `ui/src/ui/controllers/governance.ts` (code exists, needs wiring)

### CLI Commands

- [ ] `openclaw governance member add/list/remove` (code exists, needs testing)
- [ ] `openclaw governance node list`

### Scaling

- [ ] Control plane HA (replicated governance store)
- [ ] Migrate from file-based store to database (for >10 members)
- [ ] Governance data sync (push-based, for plan B architecture)
