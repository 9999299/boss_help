# AI Resume Generator / JobPilot

通过 AI 识别网页职位要求，并基于用户真实工作/项目经历生成岗位定制简历材料的 Chrome 扩展。

## 功能特性

- **智能职位分析**：自动提取页面职位描述，分析关键技能要求。
- **职业经历库**：手动维护工作、项目、技能经历，支持 PDF/DOCX/文本简历导入，逐条核实后才会参与生成。
- **AI 岗位定制**：根据岗位 JD 选择最相关的真实经历，改写为岗位导向的简历表达。
- **真实性校验**：禁止编造公司、职位、时间、技术栈、指标、团队规模；未在原始经历中出现的技术和数字会被移除并提示。
- **岗位版本管理**：同一岗位可重复生成并保留历史版本，支持编辑、单条重写、确认和复制。
- **缺口提示**：缺少的关键要求单独列出，不会用虚假经历补齐。
- **异步进度**：生成任务按步骤展示进度，支持轮询、失败重试和取消。
- **租户隔离**：服务端签名会话绑定 `tenantId/userId`，经历、任务、生成结果不能跨用户访问。
- **多格式导出**：支持 JSON、PDF；Word 导出暂未支持。
- **本地保存**：简历和职业经历库优先保存在浏览器本地。

## 安装与使用

### 开发者安装

```bash
git clone https://github.com/yourusername/chrome-resume-generator.git
cd chrome-resume-generator
npm install

# 终端 1：启动本地 API（默认 http://localhost:3000）
npm run dev:api

# 终端 2：启动侧边栏开发构建
npm start
```

本地 API 会读取根目录 `.env`（可从 `.env.example` 复制），至少需要 `AI_API_KEY`。如果扩展连接的是已部署的 Vercel API，则用生产地址重新构建：

```bash
ANALYZE_API_URL=https://your-vercel-app.vercel.app npm run build
```

在 Chrome 中加载扩展：

1. 访问 `chrome://extensions/`
2. 启用“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择 `dist` 目录

### 使用流程

1. 打开包含职位描述的网页（如 BOSS 直聘）。
2. 打开侧边栏，点击“从页面提取”并分析职位。
3. 在“经历库”中维护真实工作/项目/技能经历，或上传简历自动解析；勾选核实状态。
4. 点击“AI 定制工作经历”，切到“岗位定制”查看生成进度。
5. 检查岗位匹配、缺口提示和每条改写对应的原始描述。
6. 编辑或单条重写后可保存、确认，并复制到简历编辑器。

## 技术栈

- **前端**：React、Chrome Extension API、Webpack、Babel
- **后端**：Vercel Functions、OpenAI-compatible API（密钥只在服务端）
- **存储**：浏览器 `chrome.storage.local`；服务端可选 PostgreSQL，未配置时使用进程内存储
- **测试**：Jest、React Testing Library

## 项目结构

```text
chrome-resume-generator/
├── api/
│   ├── analyze.js              # 现有职位分析函数
│   ├── v1/[...path].js         # 经历库/岗位定制 API 入口
│   └── package.json
├── server/
│   ├── api/v1.cjs              # v1 路由、鉴权、DTO
│   ├── agent/                  # JD 分析、匹配、写作、审核、重写、简历解析
│   ├── repositories/           # memory / postgres 存储实现
│   ├── migrations/             # PostgreSQL 迁移
│   ├── auth.cjs                # HMAC 签名会话
│   └── ai.cjs                  # 模型适配器
├── public/                     # manifest、侧边栏 HTML
├── scripts/migrate.cjs         # 数据库迁移脚本
├── src/
│   ├── content.js
│   ├── background.js
│   ├── sidebar/
│   │   ├── Sidebar.jsx
│   │   └── components/         # JobAnalyzer、CareerLibraryPanel、ExperienceCustomizer 等
│   ├── utils/
│   └── styles/
└── package.json
```

## 配置说明

### 环境变量

服务端环境变量：

```bash
AI_API_KEY=your_model_api_key
AI_BASE_URL=https://api.example.com/v1
AI_MODEL=mimo-v2.5
AI_API_MODE=chat
ALLOWED_ORIGINS=chrome-extension://your-extension-id,http://localhost:3000

# 生产必须设置为固定随机值；未设置时进程内随机生成，冷启动后旧会话失效
SESSION_SECRET=replace_with_a_long_random_string

# 可选。未配置时使用进程内存储，仅适合本地调试
DATABASE_URL=postgres://user:password@host:5432/database
PGSSL=disable
```

扩展构建时只需要公开的后端地址：

```bash
ANALYZE_API_URL=https://your-vercel-app.vercel.app npm run build
```

如果模型服务使用 OpenAI Responses 协议，将 `AI_API_MODE` 设为 `responses`；使用 Chat Completions 协议时保持 `chat`。

### 数据库迁移

使用 PostgreSQL 时先执行：

```bash
DATABASE_URL=postgres://... npm run db:migrate
```

迁移文件位于 `server/migrations/`，当前包含经历库、岗位快照、Agent 任务、生成结果和 bullet 表。

### 开发探针

```bash
AI_BASE_URL=https://your-provider.example/v1 \
AI_API_KEY=your_key \
AI_MODEL=your_model \
AI_API_MODE=responses \
npm run probe:api
```

## API

所有 `/api/v1` 接口除创建会话外，均要求：

```http
Authorization: Bearer <session-token>
```

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/session` | 创建/刷新签名会话 |
| GET/PUT | `/api/v1/career-library` | 读取/覆盖当前用户经历库 |
| POST | `/api/v1/resume/parse` | 上传 PDF/DOCX 或文本并解析为经历草稿 |
| POST | `/api/v1/jobs/:id/generate-experience` | 创建岗位定制生成任务 |
| GET | `/api/v1/agent-runs/:id` | 查询任务状态与步骤进度 |
| GET | `/api/v1/agent-runs/:id/result` | 获取任务结果 |
| POST | `/api/v1/agent-runs/:id/cancel` | 取消任务 |
| POST | `/api/v1/agent-runs/:id/retry` | 从失败步骤重试 |
| GET | `/api/v1/experience-generations?job_id=` | 查询岗位的版本历史 |
| GET/PUT | `/api/v1/experience-generations/:id` | 读取/编辑生成结果 |
| POST | `/api/v1/experience-generations/:id/confirm` | 确认生成结果 |
| POST | `/api/v1/experience-generations/:id/regenerate-bullet` | 单条 bullet 重写 |

所有列表和详情查询都按签名会话中的 `tenantId + userId` 隔离；客户端传入的用户身份不会被信任。

## Agent 工作流

1. `jd_analysis`：结构化岗位 JD，识别关键要求和岗位信号。
2. `experience_retrieval`：从已核实经历库召回最相关工作/项目/技能。
3. `experience_planning`：确定为每个岗位要求使用哪些真实证据，记录缺口。
4. `experience_writing`：只基于证据改写工作/项目 bullet。
5. `experience_review`：确定性校验证据、技术词、数字、团队规模和角色膨胀，移除不支持内容。
6. `result_building`：生成匹配摘要、缺口、版本和待确认项。

真实性约束：

- 禁止新增公司、职位、时间、项目、技术、指标、团队规模或职责。
- 工作经历与项目经历不得合并。
- 没有证据的要求只进入 `missing_requirements`。
- 所有改写都保留 `original_text` 和 `evidence_ids`，便于用户核对。

## 关键提示词

- 岗位 JD 提取：`server/agent/job.cjs` 的 `buildJobAnalysisPrompt`，要求只提取 JD 明确写出的要求，并把 JD 当作不可信文本。
- 经历改写：`server/agent/writer.cjs` 的 `WRITER_SYSTEM_PROMPT` / `buildWriterPrompt`，强制只引用原始 evidence、不得新增事实、工作与项目不得互转。
- 单条重写：`server/agent/writer.cjs` 的 `buildRegeneratePrompt`，只允许基于目标经历和用户反馈改写一条 bullet。
- 简历解析：`server/agent/resume.cjs` 的 `buildPrompt`，只提取原文事实，不猜测。
- 所有提示词均在服务端，模型密钥和系统提示词不会下发到扩展。

## 测试与检查

```bash
npm test -- --runInBand
npm run lint
npm run build
```

当前测试覆盖：

- Agent 全流程、技术栈隔离、缺失要求、虚假指标、提示词注入、租户隔离、失败恢复。
- API 完整闭环：同步经历、生成、重复点击幂等、编辑、单条重写、确认、版本历史、跨租户 404。
- 经历库规范化、编辑后取消核实、导入合并、存储。
- 前端 API 会话复用、生成请求体。
- 岗位定制组件的空状态、进度、原始描述对比和编辑保存。

## Vercel 部署

```bash
npm i -g vercel
vercel deploy
```

`vercel.json` 仅配置函数超时，`api/analyze.js` 与 `api/v1/[...path].js` 由 Vercel 文件路由自动接管。部署前请设置 `AI_API_KEY`、`SESSION_SECRET`、`DATABASE_URL` 和 `ALLOWED_ORIGINS`。

> 未配置 PostgreSQL 时，Vercel 上使用进程内存储；冷启动或多实例会导致任务状态和会话不一致。生产环境应使用 PostgreSQL 并执行迁移。

## 已知限制

- 简历文件解析依赖文本层；扫描版 PDF 需要先 OCR。
- 单条重写和整份生成依赖模型能力，结果必须由用户核实。
- 当前会话是浏览器匿名身份（签名 token），不是账号登录；清除浏览器存储或 token 过期后会生成新身份。
- 未配置 `DATABASE_URL` 时任务状态不持久化。
- Word 导出按钮保持禁用，避免把未实现功能误认为可用。
- 生产必须设置固定 `SESSION_SECRET`，否则不同实例签发的会话不互通。

## 许可证

MIT License
