# 工作经历与工作年限模块设计

**日期：** 2026-10-12
**状态：** 已实现

## 问题

生成的简历草稿只有个人信息、技能、项目经验和候选公司，缺少招聘方最关注的三类内容：

1. 项目经验不完整（缺少职责描述，成果字段未被生成）；
2. 没有任何工作年限信息（总年限、相关行业经验年限）；
3. 工作经历 `experience` 始终为空，简历没有可投递的任职履历。

## 目标

- AI 根据目标岗位生成 2–3 条**工作经历草稿**：公司、职位、在职时间段、地点、工作描述、主要职责、工作成果；
- 生成**工作年限汇总**：总工作年限、相关行业经验年限、所属行业；
- 工作经历按**在职时间倒序**（最近的在最前）；
- 项目经验补齐**职责**（`responsibilities`）与**成果**（`achievements`）；
- 编辑、JSON/PDF 导出均保留上述字段，并沿用既有的"待核实"边界。

## 非目标

- 不实现 Word 导出（仍为禁用占位）；
- 不抓取外部招聘网站数据；
- 不把 AI 生成内容标记为已核实。

## 证据边界（沿用并扩展）

工作经历与工作年限是**草稿**，不是事实：

- `source: 'model'`（用户新增为 `'user'`）、`evidenceStatus: 'draft'`、`userConfirmed: false`；
- 编辑任意字段或重新生成都会把 `userConfirmed` 重置为 `false`（复用 `updateEvidenceItem`）；
- UI 与导出中，未核实条目显示"待核实/草稿"标签，核实后显示"已核实"；
- prompt 明确要求：公司名优先使用页面候选公司，没有候选时使用行业通用占位名称（如"某互联网公司"），**不编造具体知名企业的任职**。

## 数据模型（在 v2 基础上新增）

```js
{
  schemaVersion: 2,
  personalInfo, skills, education,
  experienceSummary: {
    totalYears, industryYears, industry,
    source: 'model' | 'user', evidenceStatus: 'draft', userConfirmed: false
  },
  experience: [{
    company, title, dates, location, description,
    responsibilities: [], achievements: [],
    source: 'model' | 'user', evidenceStatus: 'draft', userConfirmed: false
  }],
  projects: [{ ..., responsibilities: [], achievements: [] }],
  companyCandidates, strengths
}
```

`dates` 统一使用 `"2021.03 - 2023.06"` 形式，最近一段可用 `"2023.06 - 至今"`。

## 倒序规则

`parseStartDate` 从日期文本解析起始年月（`2020.03 - 2023.06`、`2020-2023`、`2020年3月` 均可），
`sortByDateDesc` 按起始年月倒序排列，无日期的条目排到末尾并保持原相对顺序。
前端 `normalizeResume` / `normalizeAnalysisResult` 与后端 `normalizeAnalysis` 均执行该排序，
保证编辑器、导出和 API 响应顺序一致。

## 变更文件

| 文件 | 变更 |
|------|------|
| `src/utils/resumeSchema.js` | 新增 `normalizeExperience`、`normalizeExperienceSummary`、`parseStartDate`、`sortByDateDesc`；`normalizeProject` 增加 `responsibilities`；接入 `normalizeResume` / `normalizeAnalysisResult` |
| `api/analyze.js` | prompt 新增 `experience`、`experienceSummary` 与项目 `responsibilities`；新增后端规范化与倒序排序 |
| `src/sidebar/Sidebar.jsx` | 草稿映射 `experience` / `experienceSummary`；分析结果面板新增"工作年限""工作经历草稿"区块 |
| `src/sidebar/components/ResumeEditor.jsx` | 新增工作年限编辑区与工作经历编辑区（增删改 + 核实） |
| `src/utils/resumeHtml.js` | 头部展示工作年限；工作经历按倒序渲染公司/职位/时间段/职责/成果，保留状态标签与转义 |

## 测试

- `resumeSchema.test.js`：工作经历/工作年限规范化、倒序、迁移默认值；
- `resumeHtml.test.js`：工作年限头部、倒序渲染职责与成果、字段转义；
- `ResumeEditor.test.js`：工作年限与工作经历展示、编辑重置核实、新增草稿；
- `Sidebar.test.js`：分析结果带入编辑器；
- `analyze.test.js`：后端按时间倒序规范化工作经历与工作年限。

验证：`npm test -- --runInBand`、`npm run lint`、`npm run format:check`、`npm run build`、`npm run check:secrets`。
