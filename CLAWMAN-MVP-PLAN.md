# Clawman MVP Plan

> OpenClaw fork，面向组织的 Agent 治理控制面
> 版本目标：v0.1.0 MVP
> 基于 OpenClaw 2026.3.13

---

## 一、项目定位

```
OpenClaw = 个人 AI 助手 (单人单 Agent)
Clawman  = 组织 AI 治理 (多人多 Agent + 权限 + 审计)

Clawman 不造 Agent，管 Agent。
```

**MVP 目标**：让一个 5-10 人的小团队能共用一个 Clawman 实例，成员按角色权限访问共享的 Agent 池（多对多关系，非一对一绑定），管理者能控制权限和查看审计日志。

**成员与 Agent 的关系**：

```
不是这样（一对一绑定）：
  张三 → Agent-A
  李四 → Agent-B

而是这样（多对多 + 权限控制）：
  成员 (10人)              Agent 池 (5个)
  ├── 张三 (admin)  ─────→ 所有 Agent
  ├── 李四 (member) ─────→ 代码Agent, 写作Agent (策略允许的)
  ├── 王五 (viewer) ─────→ 只读查看，不能发起调用
  └── ...

  区别在于：
  - 会话隔离：张三和李四都用代码Agent，但对话历史互不可见
  - 记忆分层：Agent 回答基于成员个人上下文 + org 级共享知识
  - 权限跟人走：viewer 用代码Agent 也不能触发部署工具
```

---

## 二、架构总览

### Agent 运行时模型

**MVP 采用"单 Gateway 多配置"模式** — Agent 不是独立进程，是同一个 Gateway 内的不同配置（prompt + tools + model）。复用 OpenClaw 现有的 subagent-registry，Clawman 只在路由入口加权限控制。

```
成员与 Agent 池的运行时关系：

┌─────────────────────────────────────────────────────┐
│  Clawman Gateway (单进程)                            │
│                                                      │
│  subagent-registry (OpenClaw 现有)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ 代码Agent │ │ 写作Agent │ │ 运维Agent │           │
│  │ prompt+   │ │ prompt+   │ │ prompt+   │           │
│  │ tools+    │ │ tools+    │ │ tools+    │           │
│  │ model     │ │ model     │ │ model     │           │
│  └──────────┘ └──────────┘ └──────────┘            │
│       ↑ ↑          ↑             ↑                   │
│       │ │          │             │                    │
│  ┌────┘ └────┐ ┌──┘        ┌───┘                    │
│  张三    李四  王五        赵六(admin)                │
│                                                      │
│  每人独立 session lane，共享 Agent 配置               │
│  权限决定谁能访问哪个 Agent                           │
└─────────────────────────────────────────────────────┘

消息流：
  消息进来 → 身份解析 (谁) → 权限检查 (能用哪些 Agent)
  → subagent-registry 路由 (复用) → 注入 scope (个人 + org 记忆)
  → Pi Agent 执行 → 审计记录 → 回复
```

**何时升级到多进程模式（V0.3+）**：Agent > 10 且高并发、需要独立安全沙盒、需要独立升级回滚。OpenClaw 已有 WebSocket RPC 模式可复用。

### 整体架构

```
┌──────────────────────────────────────────────────────┐
│                  Clawman 新增层                       │
│  ┌────────────────────────────────────────────────┐  │
│  │  Governance Module (src/governance/)            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │ Identity │ │  Policy  │ │  Audit   │       │  │
│  │  │ (身份)   │ │ (策略)   │ │ (审计)   │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘       │  │
│  │  ┌──────────┐ ┌──────────────────┐             │  │
│  │  │  Quota   │ │ Agent Access     │             │  │
│  │  │ (配额)   │ │ (Agent 池路由)   │             │  │
│  │  └──────────┘ └──────────────────┘             │  │
│  └────────────────────────────────────────────────┘  │
│                         │                             │
│                    注入钩子                            │
│                         ↓                             │
├──────────────────────────────────────────────────────┤
│              OpenClaw 现有层 (最小改动)                │
│  Gateway → subagent-registry → Agent Loop → Memory   │
└──────────────────────────────────────────────────────┘
```

---

## 三、MVP 功能范围

### 做什么 (In Scope)

| #   | 功能                | 优先级 | 说明                                 |
| --- | ------------------- | ------ | ------------------------------------ |
| 1   | 组织 + 成员模型     | P0     | Org → Member (Admin/Member/Viewer)   |
| 2   | 角色-Agent 访问控制 | P0     | 按角色决定可访问的 Agent 池 (多对多) |
| 3   | 操作审计日志        | P0     | 谁、何时、用了什么 Agent、做了什么   |
| 4   | 工具级权限白名单    | P0     | 每个角色能用哪些工具                 |
| 5   | 记忆作用域          | P1     | personal / team / org 三级           |
| 6   | Token 用量追踪      | P1     | 按成员/Agent 统计用量                |
| 7   | 月度预算上限        | P1     | 到上限后拒绝请求                     |
| 8   | 管理面板 UI         | P1     | 成员管理、权限配置、审计查看         |

### 不做什么 (Out of Scope for MVP)

- SSO/LDAP/OIDC 集成 (V1)
- 完整 RBAC/ABAC (V1)
- Agent 间通信 (V0.2)
- 审批工作流/时间锁 (V0.2)
- 多组织/SaaS 多租户 (V1)
- 合规报表导出 (V1)
- A2A 协议支持 (V1)

---

## 四、数据模型

### 新增表/文件

```typescript
// src/governance/types.ts

interface Organization {
  id: string; // uuid
  name: string; // "Fooo Team"
  createdAt: Date;
}

interface Member {
  id: string; // uuid
  orgId: string; // FK → Organization
  externalId: string; // 跨渠道统一身份 (email 或自定义)
  displayName: string;
  role: "admin" | "member" | "viewer";
  channelBindings: {
    // 关联各渠道的用户 ID
    telegram?: string; // Telegram user ID
    slack?: string; // Slack user ID
    discord?: string; // Discord user ID
    web?: string; // WebChat user ID
  };
  agentAllowlist: string[]; // 可访问的 Agent 列表 (空 = 全部, 多对多关系)
  toolDenylist: string[]; // 禁用的工具列表
  monthlyBudget?: number; // 月度 token 上限 (null = 不限)
  createdAt: Date;
}

interface AuditEntry {
  id: string;
  orgId: string;
  memberId: string; // 谁
  agentId: string; // 用了哪个 Agent
  action: string; // 'llm_call' | 'tool_use' | 'message_send' | ...
  detail: {
    tool?: string; // 工具名
    model?: string; // 模型名
    tokensUsed?: number; // token 用量
    cost?: number; // 估算费用
    input?: string; // 摘要 (截断, 不存全文)
    output?: string; // 摘要
  };
  timestamp: Date;
}

interface UsageSummary {
  orgId: string;
  memberId: string;
  month: string; // "2026-03"
  totalTokens: number;
  totalCost: number;
  callCount: number;
}

// 记忆作用域
type MemoryScope = "personal" | "team" | "org";

// 执行节点 (多机器部署)
interface ExecutionNode {
  id: string;
  name: string; // "Mac-设计师" / "云服务器-1"
  endpoint: string; // WebSocket RPC 地址
  capabilities: {
    browser: boolean; // 有没有 GUI/浏览器
    gpu: boolean; // 有没有 GPU
    localTools: string[]; // 这台机器特有的工具
  };
  agents: string[]; // 这个节点上跑哪些 Agent
  status: "online" | "offline";
}
```

### 存储方案

MVP 阶段用 JSON 文件存储 (与 OpenClaw 现有的 JSONL session store 风格一致)：

```
~/.clawman/
├── governance/
│   ├── org.json                # 组织信息
│   ├── members.json            # 成员列表
│   └── audit/
│       ├── 2026-03-14.jsonl    # 按天的审计日志 (JSONL 追加写入)
│       └── 2026-03-15.jsonl
├── memory/
│   ├── personal/{memberId}/    # 个人记忆
│   ├── team/{teamName}/        # 团队记忆 (V0.2)
│   └── org/                    # 组织记忆
└── config/
    └── clawman.json5           # Clawman 配置 (扩展 openclaw.json5)
```

---

## 五、代码改动清单

### 新增文件 (src/governance/)

```
src/governance/
├── index.ts                    # 模块入口，导出所有公共 API
├── types.ts                    # Organization, Member, AuditEntry 类型
├── identity.ts                 # 身份解析：渠道 userId → Member
├── policy.ts                   # 策略引擎：检查权限、工具白名单
├── audit.ts                    # 审计日志：写入、查询
├── quota.ts                    # 配额管理：用量统计、预算检查
├── store.ts                    # 数据存储：读写 members.json, org.json
├── middleware.ts               # Gateway 中间件：注入 governance 上下文
└── cli.ts                      # CLI 命令：clawman member add/remove/list
```

预估：~1,500-2,000 行新代码

### 修改现有文件 (最小侵入)

#### 1. Gateway 启动 — 注入 Governance 中间件

**文件**：`src/gateway/server.impl.ts`
**改动**：在 `startGatewayServer()` 中初始化 Governance 模块

```typescript
// 在 startGatewayServer() 函数中，约 line 267 之后
// 新增：
import { initGovernance } from "../governance/index.js";

// 在其他子系统初始化之后加入：
const governance = await initGovernance(config);
```

**改动量**：~10 行

#### 2. 认证层 — 身份解析增强

**文件**：`src/gateway/auth.ts`
**改动**：在 `resolveGatewayAuth()` 之后，增加 Member 解析

```typescript
// 在 resolveGatewayAuth() 返回之后
// 新增：将 channel userId 映射到 Clawman Member
import { resolveMember } from "../governance/identity.js";

// 在 auth 成功后：
const member = resolveMember(authResult.userId, channelType);
if (!member) {
  // 未注册成员，按策略处理 (拒绝或作为 guest)
}
```

**改动量**：~20 行

#### 3. Agent 执行前 — 权限检查

**文件**：`src/agents/pi-embedded-runner/run.ts`
**改动**：在 `runEmbeddedPiAgent()` 开始处加权限检查

```typescript
// 在 runEmbeddedPiAgent() 函数开头
import { checkPolicy } from "../../governance/policy.js";

// 新增权限检查：
const policyResult = checkPolicy(member, agentId, requestedTools);
if (policyResult.denied) {
  return { error: policyResult.reason };
}
// 过滤工具列表，移除 member 无权使用的工具
tools = tools.filter((t) => !policyResult.toolDenylist.includes(t.name));
```

**改动量**：~15 行

#### 4. Agent 执行后 — 审计记录

**文件**：`src/agents/pi-embedded-runner/run.ts`
**改动**：在 Agent 返回结果后记录审计

```typescript
// 在 agent 执行完成后
import { recordAudit } from "../../governance/audit.js";

// 新增审计记录：
await recordAudit({
  memberId: member.id,
  agentId,
  action: "llm_call",
  detail: { model, tokensUsed, tools: usedTools },
});
```

**改动量**：~10 行

#### 5. 记忆管理 — 加作用域

**文件**：`src/memory/manager.ts`
**改动**：`MemoryIndexManager` 构造函数加 scope 参数

```typescript
// MemoryIndexManager class, line 61
// 修改构造函数，接受 scope 参数：
constructor(config, scope?: { memberId?: string, orgId?: string }) {
  // 根据 scope 决定 SQLite 数据库路径
  // personal: ~/.clawman/memory/personal/{memberId}/
  // org:      ~/.clawman/memory/org/
}
```

**改动量**：~30 行

#### 6. 配置扩展

**文件**：`src/config/io.ts`
**改动**：`loadConfig()` 支持加载 clawman.json5 中的 governance 配置

```typescript
// 在 loadConfig() 中
// 新增：合并 clawman governance 配置
if (existsSync(clawmanConfigPath)) {
  config.governance = loadClawmanConfig(clawmanConfigPath);
}
```

**改动量**：~15 行

#### 7. Web UI — 管理面板

**文件**：新增 `ui/src/ui/views/governance.ts`

新增一个 Lit 组件作为管理面板标签页：

- 成员列表 (增删改角色)
- 权限配置 (工具白/黑名单)
- 审计日志查看 (按时间、成员筛选)
- 用量统计 (本月 token / 费用)

**改动量**：~400 行新代码
**现有文件改动**：`ui/src/ui/app.ts` 加一个导航 tab (~10 行)

---

## 六、起步部署方案

```
GCP (Control Plane)                    Mac Mini (Execution Node #1)
┌────────────────────────┐            ┌────────────────────────┐
│ Clawman Gateway        │            │ OpenClaw Worker Mode   │
│ ├── Governance 模块    │  Tailscale │ ├── 浏览器 Agent       │
│ ├── Agent Registry     │←──────────→│ ├── 视频渲染 Agent     │
│ ├── 消息路由           │  WebSocket │ ├── 本地工具           │
│ ├── 通用 Agent (无GUI) │    RPC     │ └── Playwright 实例    │
│ └── 审计/配额          │            └────────────────────────┘
└────────────────────────┘

选择理由：
- GCP 做控制面：24h 在线、公网可达、团队无需 Tailscale 也能通过渠道访问
- Mac Mini 做执行节点：有 GUI 跑浏览器、已有设备零成本、已有视频管线
- 从 Day 1 就是多节点架构，不存在"后面再改"的技术债
```

## 七、实现步骤 (按顺序)

### Phase 1: Control Plane 基础 + 节点协议 (Day 1-3)

**多节点是起步架构，不是后期功能。先把骨架搭好。**

```
□ 1.1 创建 src/governance/ 目录结构
□ 1.2 定义 types.ts (Organization, Member, AuditEntry, ExecutionNode)
□ 1.3 实现 store.ts (JSON 文件读写)
□ 1.4 实现 node-registry.ts (节点注册/心跳/状态上报)
□ 1.5 实现 node-router.ts (根据 Agent 所在节点路由请求)
□ 1.6 复用 OpenClaw 的 WebSocket RPC 模式 (原 iOS/Android node 协议)
□ 1.7 CLI: clawman node register/list/remove
□ 1.8 CLI: clawman member add/remove/list
□ 1.9 写单元测试 (store, node registry, routing)
```

**验证**：

- GCP 上的 Control Plane 能发现并连接 Mac Mini 节点
- 请求能根据 Agent 配置路由到正确节点
- 节点掉线后 Control Plane 能检测并标记 offline

### Phase 2: 身份解析 + 权限 (Day 4-5)

```
□ 2.1 实现 identity.ts (渠道 userId → Member 映射)
□ 2.2 实现 policy.ts (角色 → Agent 访问 + 工具白名单)
□ 2.3 实现 agent-access.ts (多对多: 角色/成员 → 可用 Agent 池)
□ 2.4 修改 src/gateway/auth.ts (注入 Member 解析)
□ 2.5 修改 src/agents/pi-embedded-runner/run.ts (权限检查 + 工具过滤)
□ 2.6 写集成测试 (admin 全通, member 受限, viewer 只读, 未注册拒绝)
```

**验证**：

- admin 能访问所有 Agent 和工具
- member 被过滤掉 denylist 中的工具
- viewer 只能查看，不能发起 Agent 调用
- 未注册用户被拒绝
- 权限检查在节点路由之前完成 (Control Plane 侧)

### Phase 3: 审计 + 计量 (Day 6-7)

```
□ 3.1 实现 audit.ts (JSONL 追加写入 + 按时间查询)
□ 3.2 实现 quota.ts (用量累计 + 预算检查)
□ 3.3 Agent 执行后写审计 (无论在哪个节点, 审计集中到 Control Plane)
□ 3.4 在权限检查中加入预算检查 (超额拒绝)
□ 3.5 写测试 (审计记录完整性, 跨节点审计聚合, 预算拦截)
```

**验证**：

- Mac 节点上的 Agent 调用 → 审计记录出现在 GCP Control Plane
- 累计 token 用量跨节点汇总
- 月度上限触发后拒绝新请求

### Phase 4: 记忆隔离 (Day 8-9)

```
□ 4.1 修改 MemoryIndexManager 支持 scope 参数
□ 4.2 每个节点本地存储 personal 记忆, org 记忆存在 Control Plane
□ 4.3 实现 org 级共享记忆的跨节点同步 (Control Plane → Node)
□ 4.4 写测试 (A 的记忆 B 搜不到, org 记忆所有节点都能搜到)
```

**验证**：

- 成员 A 的对话记忆只对 A 可见 (无论在哪个节点)
- org 级文档所有成员、所有节点都能搜索到
- 记忆物理存储按 scope 分离

### Phase 5: 管理面板 UI (Day 10-11)

```
□ 5.1 新增 ui/src/ui/views/governance.ts (Lit 组件)
□ 5.2 成员管理页面 (列表, 添加, 修改角色, 删除)
□ 5.3 节点状态页面 (在线/离线, Agent 分配, 健康检查)
□ 5.4 权限配置页面 (per-role Agent 访问 + 工具白名单)
□ 5.5 审计日志页面 (表格, 按成员/节点/时间筛选)
□ 5.6 用量统计页面 (本月汇总, 按成员/Agent/节点分组)
□ 5.7 在主 app.ts 中加 Governance tab
```

**验证**：Admin 能通过 Web UI 管理成员、查看节点状态、审计日志

### Phase 6: 集成测试 + 部署 (Day 12-14)

```
□ 6.1 端到端: Telegram 消息 → Control Plane 路由 → Mac 节点执行浏览器操作 → 审计记录
□ 6.2 端到端: Slack 消息 → Control Plane 路由 → GCP 本地 Agent 执行 → 审计记录
□ 6.3 写 CLAWMAN.md 文档 (架构, 部署, 配置)
□ 6.4 写 clawman.json5 示例配置 (含节点拓扑)
□ 6.5 GCP 部署脚本 (Control Plane)
□ 6.6 Mac Mini 部署脚本 (Worker Node)
□ 6.7 用自己的 Fooo 团队跑一轮真实测试
```

**验证**：

- Telegram 消息经 GCP 路由到 Mac Mini 的浏览器 Agent，操作成功
- Slack 消息在 GCP 本地 Agent 直接执行
- 所有节点的审计日志集中在 Control Plane
- Mac Mini 掉线后，浏览器 Agent 标记不可用，其他 Agent 不受影响

---

## 八、配置示例

```json5
// ~/.clawman/config/clawman.json5
{
  organization: {
    name: "Fooo Team",
    defaultRole: "member", // 新用户默认角色
    guestPolicy: "reject", // 未注册用户: reject | readonly | allow
  },

  roles: {
    admin: {
      description: "完全控制权限",
      toolDenylist: [], // 空 = 无限制
      agentAllowlist: [], // 空 = 全部 Agent
      monthlyBudget: null, // null = 不限
    },
    member: {
      description: "普通成员",
      toolDenylist: ["deploy", "db_write"],
      agentAllowlist: [],
      monthlyBudget: 100000, // 10 万 token/月
    },
    viewer: {
      description: "只读",
      toolDenylist: ["*"], // 禁用所有工具
      agentAllowlist: [],
      monthlyBudget: 10000,
    },
  },

  audit: {
    enabled: true,
    retentionDays: 90, // 审计日志保留天数
    logDetail: "summary", // summary | full (full 含完整输入输出)
  },

  memory: {
    scopeEnabled: true, // 启用记忆隔离
    orgMemoryWriteRole: "admin", // 谁能写 org 级记忆
  },

  // 节点拓扑 (多节点架构)
  nodes: {
    "gcp-control": {
      endpoint: "local", // 本机 (Control Plane 自身也是执行节点)
      capabilities: { browser: false },
      agents: ["general", "customer-support"],
    },
    "mac-mini": {
      endpoint: "wss://100.x.x.1:18789", // Tailscale IP
      capabilities: { browser: true, gpu: false },
      agents: ["code-assistant", "design-assistant", "video-renderer"],
    },
  },

  // Agent 池定义
  agents: {
    general: {
      displayName: "通用助手",
      model: "claude-haiku-4-5",
      tools: ["memory"],
      accessRoles: ["admin", "member", "viewer"],
    },
    "code-assistant": {
      displayName: "代码助手",
      model: "claude-sonnet-4-6",
      tools: ["browser", "files", "memory"],
      accessRoles: ["admin", "member"],
    },
    "design-assistant": {
      displayName: "设计助手",
      model: "claude-sonnet-4-6",
      tools: ["browser", "memory"],
      accessRoles: ["admin", "member"],
    },
  },
}
```

---

## 九、对 OpenClaw 的改动汇总

| 文件                                   | 改动类型 | 改动量        | 说明              |
| -------------------------------------- | -------- | ------------- | ----------------- |
| `src/gateway/server.impl.ts`           | 修改     | ~10 行        | 初始化 Governance |
| `src/gateway/auth.ts`                  | 修改     | ~20 行        | Member 解析       |
| `src/agents/pi-embedded-runner/run.ts` | 修改     | ~25 行        | 权限检查 + 审计   |
| `src/memory/manager.ts`                | 修改     | ~30 行        | scope 参数        |
| `src/config/io.ts`                     | 修改     | ~15 行        | 加载 clawman 配置 |
| `ui/src/ui/app.ts`                     | 修改     | ~10 行        | 加 tab            |
| **现有代码改动合计**                   |          | **~110 行**   |                   |
| `src/governance/*`                     | **新增** | ~1,500 行     | 治理模块全部代码  |
| `ui/src/ui/views/governance.ts`        | **新增** | ~400 行       | 管理面板          |
| **新增代码合计**                       |          | **~1,900 行** |                   |

**侵入度评估**：对 OpenClaw 现有 ~50,000+ 行代码只改 ~110 行 (0.2%)，冲突风险极低。

---

## 十、后续版本路线

```
v0.1 MVP (本计划)
  ✓ 组织/成员/角色
  ✓ 工具级权限
  ✓ 审计日志
  ✓ 用量追踪 + 预算
  ✓ 记忆隔离
  ✓ 管理面板

v0.2 协作
  □ Agent 间消息总线 (Agent Bus)
  □ 关键操作人类审批 (提执分离)
  □ 团队级记忆 (Team scope)
  □ 多 Agent 路由策略 (负载均衡)

v0.3 安全强化
  □ 操作时间锁 (高风险延迟执行)
  □ 多签确认 (关键操作需多人)
  □ 数据脱敏 (审计日志中敏感信息)

v1.0 企业级
  □ SSO/OIDC 集成
  □ A2A 协议支持 (Agent 发现 + 跨组织)
  □ 完整 RBAC/ABAC
  □ 合规报表 (SOC2 格式)
  □ 多组织 SaaS 模式
  □ 自定义审批工作流引擎
```

---

## 十一、风险与对策

| 风险                                 | 影响 | 对策                                              |
| ------------------------------------ | ---- | ------------------------------------------------- |
| OpenClaw upstream 大版本更新导致冲突 | 中   | 改动集中在新目录，对现有文件只加钩子，定期 rebase |
| JSON 文件存储性能瓶颈 (成员 > 100)   | 低   | MVP 够用，V1 迁移到 SQLite/PostgreSQL             |
| 渠道身份映射不准 (同一人多渠道)      | 中   | MVP 手动绑定，V0.2 加自助绑定流程                 |
| 工具名变化导致权限规则失效           | 低   | 策略引擎加 wildcard 支持 + 未知工具默认拒绝       |

---

## 十二、第一步行动

```bash
# 1. 创建目录结构
mkdir -p src/governance

# 2. 实现 types.ts + store.ts

# 3. CLI: clawman member add "Fu Tingfei" --role admin --telegram "xxx"

# 4. 验证身份解析链路

# 5. 用自己的 Fooo 团队做第一个客户
```
