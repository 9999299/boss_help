# 保存简历后按格式导出 Design

**Date:** 2026-11-11  
**Status:** Approved for implementation  
**Scope:** Chrome 扩展侧边栏 — 「保存简历」后选择 PDF / Word 并下载

## Problem

当前「保存简历」只把数据写入 `chrome.storage.local` 并弹出 `alert('简历已保存')`，没有格式选择与文件输出。用户的预期是保存后可以按格式导出成对应的简历文件。

现有导出能力分散在「导出」页签：JSON 与 PDF 可用，Word 按钮禁用（显示「暂未支持」）。

## Goals

- 点击「保存简历」后先持久化，再选择导出 PDF 或 Word
- Word 导出为真正的 `.docx` 文件
- 复用现有 PDF 生成逻辑，避免两份实现
- 保存/导出失败有明确提示，不静默失败
- 保持 Chrome 扩展环境可用，不引入服务端依赖

## Non-Goals

- 不再把 JSON 作为「保存」后的格式选项（导出页签仍保留 JSON）
- 不实现自定义模板、双栏排版、在线预览编辑
- 不实现服务端生成文件
- 不改变简历数据结构（`schemaVersion: 2`）

## Interaction

1. 用户点击「保存简历」
2. 调用现有 `onSave` → `resumeData` 写入 `chrome.storage.local`
3. 保存成功后，按钮下方展开格式选择面板：
   - 「导出 PDF」
   - 「导出 Word」
   - 「取消」
4. 选择格式后生成并下载文件；选择「取消」收起面板（简历已保存）
5. 每次重新保存都会再次显示格式选择

保存成功不再使用阻塞式 `alert`，改为内联状态文案（例如「已保存到本地，请选择导出格式」）。

## Approach

### PDF

沿用现有实现：`buildResumeHtml(resumeData)` 生成自包含 HTML → 打开临时窗口 → `window.print()` → 用户选择「存储为 PDF」→ 打印结束后关闭窗口。

### Word

引入 `docx` 依赖，在浏览器端用 `Document` / `Packer.toBlob` 生成 `.docx`，再用 `<a download>` 触发下载。

选择理由：

| 方案 | 优点 | 缺点 |
|------|------|------|
| **docx 库（选用）** | 真正的 `.docx`，Word/WPS 兼容好，排版可控 | bundle 体积增加 |
| HTML 包成 `.doc` | 零依赖 | 不是真 `.docx`，部分环境排版异常 |
| html-docx-js | 可复用 HTML | 依赖老旧、维护少 |

## Architecture

```
ResumeEditor.handleSave()
  → onSave(normalizedResume)            // 现有 Sidebar.handleSaveResume
  → 保存成功 → setShowExportPicker(true)
  → 用户选择格式
      → exportResumePdf(resumeData)
      → exportResumeDocx(resumeData)
```

新增 `src/utils/exportResume.js`：

- `exportResumePdf(resumeData)`
  - 校验 `hasResumeContent`，无内容时提示「请先在编辑器中填写简历信息。」
  - 复用 `buildResumeHtml`
  - 弹窗被拦截时提示「请允许弹窗后重试」
- `exportResumeDocx(resumeData)`
  - 校验内容
  - 构建 docx 文档并下载 `简历-<姓名>.docx`
  - 失败时 `alert('导出失败: ' + error.message)`
- 内部共享 `hasResumeContent(resumeData)` 判断

### docx 文档结构

与 `buildResumeHtml` 的章节保持一致，缺失章节跳过：

1. 姓名（标题）
2. 联系方式（邮箱 · 电话）
3. 工作年限摘要（总工作年限 / 相关行业经验）
4. 个人简介
5. 技能
6. 工作经历（公司、职位、时间、地点、描述、职责、成果）
7. 项目经历（名称、角色、时间、技术栈、描述、成果）
8. 候选公司经历（待核实）
9. 个人优势（待核实）
10. 教育经历（学校、专业、学历、时间）

### Files

| File | Change |
|------|--------|
| `src/utils/exportResume.js` | 新增：PDF / Word 导出与内容校验 |
| `src/sidebar/components/ResumeEditor.jsx` | 保存成功后显示格式选择面板；调用导出函数 |
| `src/sidebar/components/ExportPanel.jsx` | 复用 `exportResume.js`；启用 Word 按钮 |
| `package.json` / `package-lock.json` | 新增 `docx` 依赖 |
| `src/__tests__/ResumeEditor.test.js` | 保存后出现格式选择；选择格式调用导出 |
| `src/__tests__/ExportPanel.test.js` | Word 按钮改为可用 |
| `src/__tests__/exportResume.test.js` | PDF 打印窗口、Word 下载、空内容提示 |

## Error Handling

| 场景 | 行为 |
|------|------|
| 保存失败 | 内联显示错误，不出现格式选择 |
| 无简历内容 | 提示「请先在编辑器中填写简历信息。」 |
| PDF 弹窗被拦截 | 提示「请允许弹窗后重试」 |
| docx 生成失败 | 提示「导出失败: ...」 |

## Testing

- `ResumeEditor`：点击「保存简历」调用 `onSave`；保存成功后格式选择面板出现；点击 PDF / Word 调用对应导出函数（mock `exportResume`）
- `exportResume`：
  - `exportResumePdf` 打开窗口并写入 HTML、调用 `print`
  - `exportResumeDocx` 生成 Blob 并触发 `.docx` 下载
  - 空数据时不执行导出并给出提示
- `ExportPanel`：Word 按钮不再禁用

## Risks

- `docx` 依赖会增加扩展 bundle 体积，构建后需确认可接受
- docx 排版与 PDF 不完全一致（Word 使用其自身段落/样式模型）
- PDF 仍依赖浏览器打印对话框，不是一键静默下载
