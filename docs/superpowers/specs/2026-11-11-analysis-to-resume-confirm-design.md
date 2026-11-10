# 职位分析直接生成简历内容并确认生成

## 目标

分析岗位后，页面只展示与简历相关的内容（基本信息、工作年限、项目经历草稿、工作经历草稿）。用户点击「确认生成」后，将这些草稿写入简历并进入「简历编辑」。

## 交互流程

1. 用户点击「分析职位」，调用 `/api/analyze`。
2. 分析完成后**不自动切换标签页**，停留在「职位分析」。
3. 分析结果页展示：
   - 基本信息（职位、公司、部门、薪资）
   - 工作年限（待核实）
   - 项目经历草稿（待核实）
   - 工作经历草稿（待核实）
   - 基本信息区保留「AI 定制工作经历」「查找类似岗位」
   - 内容末尾提供「确认生成」按钮
4. 不再展示：候选公司、个人优势、技能匹配、简历优化建议、面试准备、职业发展。
5. 点击「确认生成」：
   - 用当前分析结果构建简历草稿
   - 切换到「简历编辑」标签
   - 不标记任何内容为已核实
6. 简历编辑器中的候选公司、个人优势区块仅在已有旧数据时显示；新生成简历不再包含这些内容。

## 后端精简

`/api/analyze` 提示词不再要求生成：

- `companyCandidates`
- `strengths`
- `interviewPrep`
- `resumeTips`
- `careerAdvice`
- `jobHighlights`

保留字段：

- 基本信息：`position`、`company`、`department`、`salaryRange`
- `coreRequirements`、`keyResponsibilities`、`skillMatch`（岗位定制流程仍会使用）
- `experienceSummary`、`projects`、`experience`

`normalizeAnalysis` 保持向后兼容，继续接受旧字段。输出更短，降低超时与 JSON 截断风险。

## 真实性约束

- 项目草稿：`evidenceStatus: "example"`、`userConfirmed: false`、`source: "model"`。
- 工作经历草稿：`evidenceStatus: "draft"`、`userConfirmed: false`。
- 「确认生成」只表示写入简历并进入编辑页，不代表用户已核实。

## 测试

- 分析完成后停留在职位分析页，且展示项目/工作经历草稿。
- 分析页不再出现候选公司、个人优势、技能匹配等区块。
- 点击「确认生成」后进入简历编辑，并包含生成的项目/工作经历。
- `/api/analyze` 提示词不再要求被移除的字段。
- 全量 `jest`、`lint`、`format:check`、`npm run build`。
