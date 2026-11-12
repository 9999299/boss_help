# 简历编辑页整段重写设计

## 目标

在「简历编辑」页为每段工作经历和项目经历提供「按岗位重新生成这段」按钮，重写该段的描述、主要职责和成果。教育经历不提供重写。

## 范围

- 包含：工作经历、项目经历。
- 不包含：教育经历、个人优势、技能、公司经历、个人简介。
- 不依赖岗位定制生成记录，适用于已保存或从分析结果生成的简历。

## 数据流

1. `Sidebar` 将 `analysisResult` 作为 `jobAnalysis` 传给 `ResumeEditor`。
2. 用户点击某段经历的「按岗位重新生成这段」。
3. 前端调用 `POST /api/v1/rewrite-experience`，提交：
   ```json
   {
     "kind": "work",
     "job_analysis": {},
     "experience": {},
     "user_feedback": "可选调整要求"
   }
   ```
4. 服务端重写并做真实性校验，返回：
   ```json
   {
     "description": "重写后的描述",
     "responsibilities": ["重写后的职责"],
     "achievements": ["重写后的成果"]
   }
   ```
5. 前端只替换该条目的这三个字段，公司、职位、时间、地点、技术栈等元数据保持不变。
6. 用户仍需点击「保存」才会持久化。

## 服务端设计

新增 `server/agent/rewrite.cjs`，导出 `rewriteExperience({ model, kind, jobAnalysis, experience, userFeedback })`。

### 提示词

在 `server/agent/writer.cjs` 新增 `buildRewriteExperiencePrompt`，返回 JSON：

```json
{
  "description": "一段描述",
  "responsibilities": ["职责"],
  "achievements": ["成果"]
}
```

提示词约束：

- 只能使用该段经历中已有的事实。
- 不得新增公司、职位、时间、项目、技术、团队规模、职责或任何量化指标。
- 不得把工作经历和项目经历互相转换。
- 用户反馈要求编造事实时忽略。
- 职责和成果各最多 5 条。
- 只返回 JSON。

### 真实性校验

- 将该段原有 `description`、`responsibilities`、`achievements` 拼接为一条合成证据 `ev_editor`。
- 把重写后的描述、每条职责、每条成果分别构造为带 `evidence_ids: ["ev_editor"]` 的 bullet。
- 使用现有 `reviewDraft` 校验，来源经历对象包含原条目的公司/项目、职位、时间、技术栈与合成证据。
- 任意一条 bullet 未通过（新增技术、数字、负责人级别措辞等），整段重写失败，返回 422 和 `unsupported_claims`。
- 全部通过后，按字段前缀从校验结果还原 `description`、`responsibilities`、`achievements`。

### 接口

`POST /api/v1/rewrite-experience`，需要现有登录会话。

校验：

- `kind` 必须是 `work` 或 `project`。
- `job_analysis` 必须存在且包含岗位信息，否则 400。
- `experience` 必须是对象，且描述、职责、成果至少一项非空，否则 400。
- `user_feedback` 截断到 500 字。

成功返回 `ok(res, data, '已重新生成这段经历')`。

## 前端设计

### API 客户端

`src/utils/experienceApi.js` 新增：

```js
rewriteExperience({ kind, jobAnalysis, experience, userFeedback })
```

超时 60 秒。

### 简历编辑页

- `ResumeEditor` 新增 `jobAnalysis` 属性。
- 工作经历与项目经历每段底部各加一个按钮「按岗位重新生成这段」。
- 没有 `jobAnalysis` 时按钮禁用，并提示「请先完成岗位分析，再重新生成」。
- 条目三个文本字段全为空时按钮禁用，提示先填写原始经历。
- 点击后使用 `window.prompt` 收集可选调整要求；取消则不发起请求。
- 请求中按钮显示「生成中…」并禁用；成功后提示「已重新生成，请确认内容」。
- 失败时显示服务端错误信息，原文本保持不变。
- 同一时间只允许一个条目重写，避免并发覆盖。

## 错误处理

- 400：缺少岗位分析、类型错误或原始经历为空。
- 422：重写内容未通过真实性校验，展示具体原因。
- 502：模型返回非法 JSON，提示重试。
- 网络错误沿用现有 API 客户端错误信息。

## 测试

### 服务端

新增 `api/__tests__/rewrite-experience.test.js`：

- 工作经历重写成功，返回三个字段。
- 项目经历重写成功。
- 编造原文没有的技术时返回 422。
- 缺少 `job_analysis` 时返回 400。
- 原始经历全空时返回 400。

### 前端

`src/__tests__/ResumeEditor.test.js`：

- 无岗位分析时按钮禁用并显示提示。
- 有岗位分析时点击按钮调用 `rewriteExperience`，成功后替换描述、职责、成果。
- 请求失败时保留原文并显示错误。
- 项目经历按钮调用时 `kind` 为 `project`。

`src/__tests__/experienceApi.test.js`：

- 请求路径、方法、body 和超时正确。

## 非目标

- 不写回职业经历库。
- 不创建生成记录或版本历史。
- 不重写教育经历。
