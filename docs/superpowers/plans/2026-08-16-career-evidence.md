# 岗位定制化求职材料实施计划

## 1. 统一数据模型（TDD）

- 新增 `src/utils/resumeSchema.js`，提供项目、候选公司、优势和旧简历迁移的 normalize 函数。
- 先新增 `src/__tests__/resumeSchema.test.js`，验证默认状态、来源、旧项目迁移和用户编辑后确认状态重置。
- `Sidebar` 生成 v2 简历结构，`saveResume/loadResume` 统一迁移。

## 2. 安全后端 API（TDD）

- 重写 `api/analyze.js`：模型客户端延迟创建，使用 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`；输入限制、超时、响应解析、规范化和明确状态码。
- 重写 `api/__tests__/analyze.test.js`，覆盖成功、400、405、413、429、502、504 和 OPTIONS。
- 前端 `src/utils/api.js` 只请求 `__ANALYZE_API_URL__/api/analyze`，删除 API key 与模型 prompt。
- 新增前端 API 测试，验证请求形状和非 2xx 错误。

## 3. 页面提取与扩展权限（TDD）

- `JobAnalyzer` 提取并提交 `pageUrl`、`pageTitle`、`companyHints`，显示发送 AI 提示和受限页面回退。
- 移除 manifest 全站 content script 和 `<all_urls>`。
- webpack 从非敏感 `ANALYZE_API_URL` 生成唯一 API origin 的 `host_permissions`。
- 新增 manifest 生成测试或可独立测试的 helper。

## 4. 编辑与展示（TDD）

- `ResumeEditor` 支持项目 achievements/状态、候选公司、个人优势的新增、编辑、删除、核实。
- `Sidebar` 展示候选公司和个人优势，并把分析结果完整映射到 v2 resume。
- 补组件测试：字段展示、编辑重置确认、保存完整结构、错误重试提示。

## 5. 导出与文档（TDD）

- `buildResumeHtml` 输出项目成果、候选公司和个人优势，所有文本转义，并保留未核实标签。
- JSON 保留完整 v2；Word 按钮改为禁用/暂未支持。
- README、`.env.example` 更新为后端配置和安全说明。
- 添加 `scripts/check-secrets.js` 与 `npm run check:secrets`。

## 6. 验证

- 运行新增测试的 RED→GREEN 循环并最终执行：
  - `npm test -- --runInBand`
  - `npm run lint`
  - `npm run build`
  - `npm run check:secrets`
- 使用用户授权的临时环境变量对 `https://ai.centos.hk/v1` 做真实模型联调，确认返回项目、候选公司和个人优势。
- 审核构建 manifest 权限与 `dist` 密钥扫描结果。
