# 调研发现

- 当前项目是 React + Webpack 的 Manifest V3 Chrome 扩展。
- 当前测试基线：6 个测试套件、26 个测试通过；ESLint 和生产构建通过。
- `src/utils/api.js` 直接从扩展前端调用模型 API；`api/analyze.js` 另有一套未被前端使用的 Vercel 函数实现。
- `src/config.js`（被 gitignore）包含明文 API key，webpack DefinePlugin 会将其注入 `dist/sidebar.js`；正式实现必须移除这一模式。
- 当前已有项目经历生成/对齐逻辑，但没有公司经历、个人优势字段和对应编辑/导出展示。
- Word 导出按钮目前只是“开发中”提示；README 与实际状态不完全一致。
- `public/manifest.json` 对所有 URL 注入 content script，权限范围偏宽。

## 实施后的验证发现

- v2 简历结构已将 `experience`（真实经历）与 `companyCandidates`（候选公司）分离；三类 AI 内容均有 `source`、`evidenceStatus`、`userConfirmed`。
- 前端只调用 `${ANALYZE_API_URL}/api/analyze`；后端支持 Chat Completions 和 Responses 两种协议，`AI_API_MODE` 控制。
- webpack 构建期按 API origin 生成 `host_permissions`，并清理旧 dist；`npm run check:secrets` 扫描源码、API 和构建产物。
- 本地验证已通过 14 个测试套件、56 个测试，以及 lint、format:check、production build、manifest 权限断言和密钥扫描。
- `https://ai.centos.hk/v1` 的 `/models`、IPv4 请求和 Responses 探针在当前网络均连接超时，无法取得真实模型返回；未将该失败伪装为成功。
- 分析表单新增“相关岗位公司”手工输入，用户可粘贴 BOSS 相关岗位公司名，作为模型候选来源。

## 工作经历模块实施后的验证发现

- v2 简历新增 `experienceSummary`（总工作年限/行业年限/行业）与 `experience[]`（公司/职位/时间段/地点/描述/职责/成果），默认 `evidenceStatus: 'draft'`、`userConfirmed: false`。
- `experience` 从“仅真实经历、始终为空”改为“AI 草稿 + 用户可编辑”，但公司名优先取页面候选、无候选时用行业占位名，避免被误认为真实任职；候选公司 `companyCandidates` 仍与 `experience` 分离。
- 倒序由 `parseStartDate` + `sortByDateDesc` 统一实现，前端 normalize、后端 normalizeAnalysis、导出渲染三处一致；无日期条目排在末尾。
- `resumeHtml.js` 的 ESM 相对导入必须带 `.js` 扩展名，否则 webpack 严格解析报错（Jest 不受影响，只在 build 暴露）。
- 当前基线：14 套测试、68 个测试通过；lint、format:check、production build、check:secrets 通过。
