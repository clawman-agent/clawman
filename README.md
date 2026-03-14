# Clawman

Enterprise multi-member, multi-agent governance control plane. Built as an [OpenClaw](https://github.com/openclaw/openclaw) fork with minimal upstream invasion (~150 lines modified) and ~1,500 lines of new governance modules.

## What It Does

Clawman adds an organizational governance layer on top of OpenClaw's agent infrastructure:

- **Member management** — Role-based access (admin/member/viewer) with channel bindings (Telegram, Slack, Discord)
- **Policy engine** — Agent allowlists, tool denylists, monthly budget caps per role and per member
- **Audit trail** — JSONL append-only logs for every agent interaction
- **Usage tracking** — Per-member monthly token and cost metering
- **Memory isolation** — Personal and org-level memory scopes
- **Multi-node routing** — GCP Control Plane + Mac Mini execution nodes via Tailscale

## Architecture

```
              Telegram / Slack / Discord
                        |
                   +----v----+
                   |   GCP   |  Control Plane
                   | Clawman |  governance + routing + headless agents
                   +----+----+
                        | Tailscale
                   +----v----+
                   |Mac Mini |  Execution Node
                   | Worker  |  browser agents + video rendering
                   +---------+
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Create governance config
mkdir -p ~/.clawman/config
cp config/clawman.json5.example ~/.clawman/config/clawman.json5

# Add yourself as admin
pnpm openclaw governance member add "Your Name" \
  --role admin --telegram "your_telegram_id"

# Start gateway
pnpm dev
# Open http://localhost:18789 -> Governance tab
```

## CLI

```bash
openclaw governance member add <name> --role <admin|member|viewer> [--telegram <id>] [--slack <id>]
openclaw governance member list
openclaw governance member remove <id>
openclaw governance node list
```

## Deployment

```bash
# GCP Control Plane
scripts/deploy-gcp.sh

# Mac Mini Worker
scripts/deploy-mac-worker.sh
```

See `config/clawman.json5.example` for full configuration reference.

## Governance Data

All governance data lives at `~/.clawman/` (separate from `~/.openclaw/`):

```
~/.clawman/
  config/clawman.json5          # Governance config
  governance/
    org.json                    # Organization
    members.json                # Member registry
    audit/YYYY-MM-DD.jsonl      # Audit logs
    usage/YYYY-MM.json          # Monthly usage
  memory/
    personal/{memberId}/        # Per-member memory
    org/                        # Shared org memory
```

## Upstream

Clawman tracks [OpenClaw](https://github.com/openclaw/openclaw) `main` via the `upstream` remote. Governance modules are additive and isolated under `src/governance/`, making rebases straightforward.

## License

This project uses a dual-license model:

- **Upstream OpenClaw code** — [MIT License](LICENSE) (unchanged from upstream)
- **Clawman governance modules** (`src/governance/`, `ui/src/ui/views/governance.ts`, `ui/src/ui/controllers/governance.ts`, `Dockerfile.clawman`, `scripts/deploy-*`, `config/clawman.*`) — [FSL-1.1-Apache-2.0](src/governance/LICENSE) (Functional Source License)

**What this means:** You can freely use, modify, and deploy Clawman for your own internal purposes. You cannot use the governance modules to build a competing product or service. After 2 years, the governance code automatically converts to Apache 2.0.
