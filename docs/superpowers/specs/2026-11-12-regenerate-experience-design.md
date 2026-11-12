# 整段工作/项目经历重新生成设计

## 背景

岗位定制结果目前只支持单条 bullet 重新生成（`regenerate-bullet`）。用户希望以「一段工作经历 / 一段项目经历」为单位，一次重写该段全部 bullet，同时保留真实性校验。

## 目标

- 在每条工作经历和项目经历上提供「重新生成整段」按钮。
- 新增服务端接口，一次重写指定来源经历的整段 bullet。
- 复用现有 `WRITER_SYSTEM_PROMPT` 和 `reviewDraft` 真实性校验。
- 保留现有单条 bullet 重新生成功能。

## 非目标

- 不改变整套重新生成流程。
- 不修改数据库结构或已确认版本的状态规则。
- 不新增账号/权限模型。

## 服务端设计

### 1. 提示词（`server/agent/writer.cjs`）

新增 `buildRegenerateExperiencePrompt({ jobAnalysis, experience, currentBullets, userFeedback, style })`：

- 输入目标经历完整 JSON、当前 bullet 列表、岗位分析、用户反馈。
- 规则与单条重写一致：只能引用目标经历中的事实和 evidence id，不得新增公司、职位、时间、技术、指标、团队规模。
- 只返回 JSON：

```json
{ "bullets": [{ "text": "重写后的描述", "evidence_ids": ["真实 evidence id"] }] }
```

### 2. 重写逻辑（`server/agent/regenerate.cjs`）

新增 `regenerateExperience({ repository, model, ctx, generationId, sourceExperienceId, userFeedback })`：

1. 读取 generation；不存在返回 404；`confirmed` 返回 409。
2. 在 `resultJson.work_experiences` / `project_experiences` 中按 `source_experience_id` 找到目标条目；不存在返回 404。
3. 从 `sourceSnapshot.experiences` 找到真实来源；不存在返回 409。
4. 调用模型（step `regenerate_experience`），解析 JSON；非法 JSON 返回 502。
5. 用目标来源构造单段 draft，交给 `reviewDraft` 校验全部 bullet。
6. 过滤未通过校验的 bullet；若一条都不剩，返回 422 并带上 `unsupported_claims`。
7. 仅用审查后的 bullets 替换原条目的 bullets，保留公司、职位、项目名称、时间、技术栈等元数据。
8. 写入 `needs_user_confirmation` 提示，保存 generation（status `edited`），调用 `replaceBullets`。
9. 返回 `{ generation, experience }`。

### 3. API（`server/api/v1.cjs`）

新增：

```text
POST /api/v1/experience-generations/:id/regenerate-experience
Body: { "source_experience_id": "...", "user_feedback": "可选，最多 500 字" }
```

- 缺少 `source_experience_id` 返回 400。
- 成功返回 message `整段经历已重新生成`。

## 前端设计

### 1. API 客户端（`src/utils/experienceApi.js`）

新增 `regenerateExperience({ generationId, sourceExperienceId, userFeedback })`，POST 到上述接口，timeout 60s。

### 2. 岗位定制组件（`src/sidebar/components/ExperienceCustomizer.jsx`）

- 每段工作经历 / 项目经历标题区域新增「重新生成整段」按钮，仅在未确认版本显示。
- 点击后沿用现有 `window.prompt` 收集反馈，调用 `regenerateExperience`。
- 成功后用返回的 generation 更新页面，提示「整段经历已重新生成并通过真实性检查」。
- 失败时展示服务端错误信息。
- 保留现有「重新生成这条」按钮。

## 测试策略

- `api/__tests__/experience-agent.test.js`：新增整段重写流程测试，覆盖工作经历与项目经历、成功替换、已确认版本拒绝。
- `src/__tests__/experienceApi.test.js`：断言请求路径、方法和 body。
- `src/__tests__/ExperienceCustomizer.test.js`：断言每段经历出现「重新生成整段」按钮，点击后调用 API。
- 运行 `npm test -- --runInBand`、`npm run lint`、`npm run build`。

## 风险

- 整段重写可能减少 bullet 数量；通过保留已通过校验的 bullet 并提示用户确认降低风险。
- 模型可能引用错误 evidence；沿用 reviewer 的 evidence/技术/指标校验进行拦截。
