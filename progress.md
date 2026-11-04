# 进度记录

## 2026-08-16

- 完成当前代码、测试、构建和安全风险检查。
- 已创建本任务的计划、发现和进度文件。
- 已提交设计草案：`docs/superpowers/specs/2026-08-16-career-evidence-design.md`。
- 设计文档提交因 `.git/index.lock` 权限限制失败，未修改用户已有代码。
- 第一轮规格审阅发现数据模型、确认流程、API 状态码和权限边界不足，已完成修订。
- 第二轮规格审阅发现用户新增条目缺少合法来源值、生产/开发后端 host permission 未落地，已完成修订。
- 第三轮规格审阅已通过。
- 已创建实施计划：`docs/superpowers/plans/2026-08-16-career-evidence.md`。
- 当前进入 TDD 实现阶段，先完成统一数据模型与安全后端 API。
- 已完成 13 套、50 个单元/组件测试；首次 lint/build 发现构建变量声明和 ESM 扩展名问题，正在修复。
- lint/build 修复后通过；构建后发现历史 `dist` chunk 残留旧密钥，已增加自动清理与 dist 扫描。
- 重新构建已清除历史密钥 chunk，`npm run check:secrets` 通过。
- 真实 API 域名在放行网络后仍连续连接超时；已补充 Chat/Responses 双协议适配和测试。
- 真实探针暴露 SDK 默认超时过长问题，已固定服务端客户端 30 秒超时，待重试。
- 最终本地验证通过：54 tests、lint、format:check、production build、manifest 权限断言、check:secrets。
- 增加页面公司来源校验后，最终测试数为 55，全部通过。
- 增加 BOSS 相关岗位公司手工输入后，最终测试数为 56，全部通过；格式、lint、构建和密钥扫描继续通过。
- `ai.centos.hk` 的 models/curl 与 Responses 探针均无法在当前网络环境建立连接；未把该外部失败伪装成成功。

## 2026-10-12

- 新增工作经历与工作年限模块（见 `docs/superpowers/specs/2026-10-12-work-experience-design.md`）。
- 数据模型：新增 `experience[]`（公司/职位/时间段/地点/描述/职责/成果）与 `experienceSummary`（总年限/行业年限/行业），均带 `source`/`evidenceStatus`/`userConfirmed`；`projects` 增加 `responsibilities`。
- 倒序：新增 `parseStartDate` + `sortByDateDesc`，前端 normalize、后端 normalizeAnalysis 与导出渲染均按在职时间倒序。
- 后端 prompt 要求生成工作经历草稿并优先使用页面候选公司，无候选时用行业占位名，不编造具体企业任职。
- UI：编辑器新增工作年限与工作经历编辑区；分析结果面板新增工作年限与工作经历草稿区块；PDF 导出头部展示工作年限。
- 验证通过：14 套测试、68 个测试；lint、format:check、production build、check:secrets 全绿。
- 构建期修复 `resumeHtml.js` 的 ESM 相对导入缺 `.js` 扩展名（webpack 严格解析）。
