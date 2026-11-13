# boss_help 侧边栏 UI 美化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Chrome 侧边栏升级为现代求职 SaaS 视觉，并把品牌统一为 `boss_help`，不改变业务逻辑。

**Architecture:** 以 `src/styles/sidebar.css` 的 CSS 变量作为设计令牌，整体重写基础、组件和页面级样式；仅对 `Sidebar.jsx` 的品牌栏与标签页做轻量结构调整，其余组件沿用现有类名。

**Tech Stack:** React 19、Webpack、Jest + React Testing Library、原生 CSS。

## Global Constraints

- 主色 `#0E9F7E`，hover `#0B8468`，浅色底 `#E7F6F1`；强调橙 `#F5A524`。
- 页面背景 `#F5F7F6`，卡片 `#FFFFFF`，正文 `#1F2A32`，次要文字 `#66727C`，边框 `#E3E8E6`。
- 语义色：成功 `#12B76A`，警告 `#F79009`，错误 `#E5484D`。
- 字号 12/13/14/18px，正文行高 1.55；圆角 8/12/16/999px。
- 品牌名统一为 `boss_help`。
- 不修改业务逻辑、API、数据结构、其他组件行为。
- 所有现有类名必须保留，避免组件样式失效。

---

### Task 1: 品牌重命名

**Files:**
- Modify: `src/__tests__/Sidebar.test.js:47-50`
- Modify: `src/sidebar/Sidebar.jsx:121`
- Modify: `public/manifest.json:3,5,17`
- Modify: `public/sidebar.html:6`
- Modify: `README.md:1`

**Interfaces:**
- Consumes: 现有 `Sidebar` 组件与 manifest。
- Produces: 品牌文案 `boss_help`，后续任务沿用。

- [ ] **Step 1: 修改失败测试**

把 `src/__tests__/Sidebar.test.js` 的标题断言改为：

```js
  test('渲染侧边栏标题', () => {
    render(<Sidebar />);
    expect(screen.getByText('boss_help')).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand src/__tests__/Sidebar.test.js`
Expected: FAIL，找不到 `boss_help`。

- [ ] **Step 3: 最小实现品牌文案**

`src/sidebar/Sidebar.jsx`：

```jsx
      <div className="header">
        <h1>boss_help</h1>
      </div>
```

`public/manifest.json`：

```json
{
  "manifest_version": 3,
  "name": "boss_help",
  "version": "1.0.0",
  "description": "AI 分析职位要求并生成针对性简历",
  "permissions": ["activeTab", "scripting", "sidePanel", "storage"],
  "host_permissions": [
    "https://www.zhipin.com/*",
    "https://*.zhipin.com/*"
  ],
  "action": {
    "default_title": "boss_help"
  },
  "side_panel": {
    "default_path": "sidebar.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

`public/sidebar.html`：

```html
  <title>boss_help</title>
```

`README.md` 第一行：

```markdown
# boss_help / JobPilot
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --runInBand src/__tests__/Sidebar.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/__tests__/Sidebar.test.js src/sidebar/Sidebar.jsx public/manifest.json public/sidebar.html README.md
git commit -m "feat: 品牌统一为 boss_help"
```

---

### Task 2: 设计令牌、品牌栏与可访问标签页

**Files:**
- Modify: `src/__tests__/Sidebar.test.js`（在标题测试后新增标签角色测试）
- Modify: `src/sidebar/Sidebar.jsx:118-155`
- Modify: `src/styles/sidebar.css:1-82`

**Interfaces:**
- Consumes: Task 1 的 `boss_help` 品牌。
- Produces: `.brand`、`.brand-mark`、`.brand-text`、`.tab-icon`、`.tabs` 可滚动 pill 样式；标签按钮 `role="tab"`、`aria-selected`。

- [ ] **Step 1: 新增失败测试并更新标签角色断言**

把 `src/__tests__/Sidebar.test.js` 中所有针对标签页的 `getByRole('button', { name: '简历编辑' })`、`getByRole('button', { name: '导出' })` 改为 `getByRole('tab', ...)`（共 5 处：56、58、68、74、108 行）。

在标题测试后加入：

```js
  test('标签页使用可访问的 tab 角色并标记选中项', () => {
    render(<Sidebar />);
    expect(screen.getByRole('tab', { name: '职位分析' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: '经历库' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --runInBand src/__tests__/Sidebar.test.js`
Expected: FAIL，找不到 role 为 `tab` 的元素。

- [ ] **Step 3: 重写 Sidebar 品牌栏与标签页**

在 `Sidebar.jsx` 组件外定义标签数据与图标：

```jsx
const TAB_ITEMS = [
  {
    id: 'analyzer',
    label: '职位分析',
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
  },
  {
    id: 'library',
    label: '经历库',
    icon: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 5.5v16" />
      </>
    ),
  },
  {
    id: 'customize',
    label: '岗位定制',
    icon: (
      <>
        <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
        <path d="m18 15 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
      </>
    ),
  },
  {
    id: 'editor',
    label: '简历编辑',
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
  },
  {
    id: 'export',
    label: '导出',
    icon: (
      <>
        <path d="M12 3v11" />
        <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
        <path d="M4 17v3h16v-3" />
      </>
    ),
  },
];
```

替换 header 与 tabs：

```jsx
      <div className="header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            B
          </div>
          <div className="brand-text">
            <h1>boss_help</h1>
            <p>AI 求职助手</p>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="功能导航">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <svg
              className="tab-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {tab.icon}
            </svg>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
```

- [ ] **Step 4: 用设计令牌重写基础、品牌栏与标签页样式**

把 `sidebar.css` 开头到 `.tab.active` 的规则替换为：

```css
:root {
  --color-primary: #0e9f7e;
  --color-primary-hover: #0b8468;
  --color-primary-soft: #e7f6f1;
  --color-primary-soft-strong: #c9ece1;
  --color-accent: #f5a524;
  --color-accent-soft: #fff4e0;
  --color-bg: #f5f7f6;
  --color-surface: #ffffff;
  --color-text: #1f2a32;
  --color-text-muted: #66727c;
  --color-text-subtle: #8a949c;
  --color-border: #e3e8e6;
  --color-border-strong: #d3dbd8;
  --color-success: #12b76a;
  --color-success-soft: #e9f9f1;
  --color-warning: #f79009;
  --color-warning-soft: #fff6e6;
  --color-danger: #e5484d;
  --color-danger-soft: #fdecec;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 2px rgba(23, 44, 38, 0.06);
  --shadow-md: 0 8px 24px rgba(23, 44, 38, 0.1);
  --font-sans:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 400px;
  min-height: 500px;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: var(--radius-pill);
  background: #cfd8d4;
  background-clip: padding-box;
}

.sidebar-container {
  padding: 0 16px 24px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  margin: 0 -16px 14px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--color-border);
  background: rgba(245, 247, 246, 0.88);
  backdrop-filter: blur(12px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: linear-gradient(135deg, #12b78f, #0b7c66);
  box-shadow: 0 6px 14px rgba(14, 159, 126, 0.28);
  color: #fff;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.brand-text h1 {
  font-size: 17px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.brand-text p {
  margin-top: 1px;
  color: var(--color-text-muted);
  font-size: 11.5px;
}

.tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  padding-bottom: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    box-shadow 0.16s ease;
}

.tab:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.tab.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  box-shadow: 0 4px 12px rgba(14, 159, 126, 0.24);
  color: #fff;
}

.tab-icon {
  width: 14px;
  height: 14px;
  flex: none;
}

.btn:focus-visible,
.tab:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

- [ ] **Step 5: 运行测试与 lint**

Run: `npm test -- --runInBand src/__tests__/Sidebar.test.js`
Expected: PASS。

Run: `npm run lint`
Expected: 无错误。

- [ ] **Step 6: 提交**

```bash
git add src/__tests__/Sidebar.test.js src/sidebar/Sidebar.jsx src/styles/sidebar.css
git commit -m "feat: boss_help 品牌栏与可滚动标签页"
```

---

### Task 3: 按钮、表单、卡片、标签与状态提示统一

**Files:**
- Modify: `src/styles/sidebar.css`（替换按钮及之后的旧组件规则）

**Interfaces:**
- Consumes: Task 2 的设计令牌。
- Produces: 统一 `.btn`、`.form-group`、`.section`、`.skill-tag`、`.evidence-item`、`.error-message` 等类名视觉。

- [ ] **Step 1: 替换按钮样式**

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.btn:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-primary {
  background: linear-gradient(135deg, #12b78f, #0b8468);
  box-shadow: 0 6px 16px rgba(14, 159, 126, 0.22);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 8px 20px rgba(14, 159, 126, 0.3);
}

.btn-secondary {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary-soft-strong);
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}

.btn-danger {
  border-color: rgba(229, 72, 77, 0.25);
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.btn:disabled {
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.5;
}
```

- [ ] **Step 2: 替换表单样式**

```css
.form-group {
  margin-bottom: 12px;
}

.form-group label,
.section label {
  display: block;
  margin-bottom: 5px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.form-group input,
.form-group textarea,
.section input,
.section select,
.section textarea,
.bullet-editor textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: #fbfcfc;
  color: var(--color-text);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease;
}

.section input,
.section select,
.section textarea {
  margin-bottom: 8px;
}

.form-group input:focus,
.form-group textarea:focus,
.section input:focus,
.section select:focus,
.section textarea:focus,
.bullet-editor textarea:focus {
  border-color: var(--color-primary);
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(14, 159, 126, 0.14);
}

.form-group input::placeholder,
.form-group textarea::placeholder,
.section input::placeholder,
.section textarea::placeholder {
  color: var(--color-text-subtle);
}
```

- [ ] **Step 3: 替换卡片、标题与标签样式**

```css
.content {
  min-height: 400px;
}

.section {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.section h4,
.analysis-result h4,
.export-preview h4 {
  margin-bottom: 10px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 700;
}

.project-item,
.evidence-item,
.agent-progress,
.match-summary,
.generated-experience,
.bullet-editor,
.version-history,
.example-project-card,
.export-picker,
.export-preview pre {
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.project-item,
.evidence-item,
.example-project-card {
  margin-bottom: 12px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.project-item:hover,
.evidence-item:hover,
.example-project-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.skill-tag,
.library-stats span,
.generation-status,
.version-badge,
.example-badge,
.gap-chip,
.evidence-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  background: #eef2f0;
  color: var(--color-text-muted);
  font-size: 11.5px;
  font-weight: 600;
}

.skill-tag {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}

.skill-tag button {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 0;
}

.gap-chip {
  background: var(--color-accent-soft);
  color: #a0440a;
}

.example-badge {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}

.example-badge.pending,
.evidence-state.pending {
  background: var(--color-warning-soft);
  color: #8a5a00;
}

.evidence-state.confirmed {
  background: var(--color-success-soft);
  color: #155724;
}
```

- [ ] **Step 4: 替换状态提示样式**

```css
.privacy-hint,
.hint {
  color: var(--color-text-muted);
  font-size: 11.5px;
  line-height: 1.55;
}

.privacy-hint {
  margin: 8px 0 12px;
}

.error-message,
.warning-message,
.success-message,
.hint-block,
.editor-notice {
  margin: 8px 0;
  padding: 9px 11px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.55;
}

.error-message {
  border-left: 3px solid var(--color-danger);
  background: var(--color-danger-soft);
  color: #842029;
}

.warning-message {
  border-left: 3px solid var(--color-warning);
  background: var(--color-warning-soft);
  color: #856404;
}

.success-message {
  border-left: 3px solid var(--color-success);
  background: var(--color-success-soft);
  color: #155724;
}

.hint-block {
  border-left: 3px solid var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}

.editor-notice {
  border-left: 3px solid var(--color-success);
  background: var(--color-success-soft);
  color: #1b5e20;
}
```

- [ ] **Step 5: 运行测试与构建**

Run: `npm test -- --runInBand`
Expected: PASS。

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 6: 提交**

```bash
git add src/styles/sidebar.css
git commit -m "feat: 统一按钮表单卡片与状态提示视觉"
```

---

### Task 4: 岗位分析结果信息网格与剩余页面统一

**Files:**
- Modify: `src/sidebar/Sidebar.jsx:208-247`（基本信息区）
- Modify: `src/styles/sidebar.css`（分析结果、经历库、定制、编辑、导出剩余规则）

**Interfaces:**
- Consumes: Task 2/3 的设计令牌与卡片样式。
- Produces: `.analysis-overview`、`.info-chip`、`.analysis-result`、`.analysis-section`、`.export-options` 等统一视觉。

- [ ] **Step 1: 给基本信息区加网格类与薪资 chip**

把 `Sidebar.jsx` 第一处分析区块改为：

```jsx
          <div className="analysis-section analysis-overview">
            <h5>基本信息</h5>
            <p>
              <strong>职位：</strong>
              {analysisResult.position || '-'}
            </p>
            {analysisResult.company && (
              <p>
                <strong>公司：</strong>
                {analysisResult.company}
              </p>
            )}
            {analysisResult.department && (
              <p>
                <strong>部门：</strong>
                {analysisResult.department}
              </p>
            )}
            {analysisResult.salaryRange && (
              <p>
                <strong>薪资：</strong>
                <span className="info-chip">{analysisResult.salaryRange}</span>
              </p>
            )}
            <div className="analysis-actions">
              <button
                className="btn btn-primary btn-customize-experience"
                onClick={handleOpenCustomizer}
                disabled={!jobData}
              >
                AI 定制工作经历
              </button>
              <button
                className="btn btn-secondary btn-search-similar"
                onClick={() => handleSearchSimilar(analysisResult)}
              >
                查找类似岗位
              </button>
            </div>
          </div>
```

- [ ] **Step 2: 替换分析结果与页面级样式**

```css
.analysis-result {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
}

.analysis-section {
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.analysis-section h5 {
  margin: 0 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.analysis-overview {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
}

.analysis-overview h5,
.analysis-overview .analysis-actions {
  grid-column: 1 / -1;
}

.analysis-section p {
  margin: 4px 0;
  color: var(--color-text);
  font-size: 12px;
  line-height: 1.6;
}

.analysis-section strong {
  color: var(--color-text-muted);
  font-weight: 600;
}

.analysis-section ul {
  margin: 4px 0;
  padding-left: 18px;
  color: var(--color-text);
  font-size: 12px;
  line-height: 1.6;
}

.analysis-section li + li {
  margin-top: 3px;
}

.info-chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: #a0440a;
  font-size: 11.5px;
  font-weight: 600;
}

.analysis-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.analysis-actions .btn {
  padding: 7px 12px;
  font-size: 12px;
}

.btn-search-similar {
  margin-top: 0;
}

.library-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.inline-fields,
.import-actions,
.paste-resume,
.result-actions,
.export-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}

.paste-resume,
.export-options {
  flex-direction: column;
}

.inline-fields input {
  flex: 1;
}

.confirm-row {
  display: flex !important;
  align-items: center;
  gap: 6px;
}

.confirm-row input[type='checkbox'],
.evidence-item input[type='checkbox'] {
  width: auto;
  margin: 0;
  accent-color: var(--color-primary);
}

.customizer-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.customizer-header h3 {
  font-size: 15px;
  font-weight: 700;
}

.generation-status.running {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
}

.generation-status.completed,
.generation-status.confirmed {
  background: var(--color-success-soft);
  color: #155724;
}

.generation-status.failed {
  background: var(--color-danger-soft);
  color: #842029;
}

.agent-progress h4 {
  margin-bottom: 8px;
}

.agent-progress ol {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
}

.agent-progress .step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--color-text-muted);
  font-size: 12px;
}

.agent-progress .step.completed {
  color: #155724;
}

.agent-progress .step.running {
  color: var(--color-primary-hover);
  font-weight: 600;
}

.agent-progress .step.failed {
  color: #842029;
}

.step-icon {
  width: 14px;
  text-align: center;
}

.match-score {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}

.match-score strong {
  color: var(--color-primary);
  font-size: 26px;
  font-weight: 750;
}

.match-score span,
.experience-dates {
  color: var(--color-text-muted);
  font-size: 11.5px;
}

.bullet-original p {
  margin: 2px 0 0;
  padding: 7px 9px;
  border-left: 3px solid var(--color-border-strong);
  background: #fbfcfc;
  color: var(--color-text-muted);
  font-size: 11.5px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.bullet-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
  color: var(--color-text-muted);
  font-size: 11px;
}

.link-button {
  border: none;
  background: none;
  color: var(--color-primary-hover);
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 600;
  padding: 0;
}

.link-button.danger {
  color: var(--color-danger);
}

.version-history ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.version-history li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: 11.5px;
}

.version-history li:last-child {
  border-bottom: none;
}

.version-history li.current .link-button {
  color: var(--color-text);
  font-weight: 700;
}

.version-history small {
  color: var(--color-text-muted);
}

.example-projects {
  margin: 16px 0;
  padding: 14px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: #fafcfb;
}

.example-projects-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.example-project-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.example-project-meta,
.example-project-tech,
.example-project-covered {
  margin: 4px 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.example-project-card ul {
  margin: 6px 0;
  padding-left: 18px;
  font-size: 13px;
}

.gap-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 8px 0;
  color: var(--color-text-muted);
  font-size: 12px;
}

.export-preview pre {
  max-height: 300px;
  overflow: auto;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}

.save-error {
  margin-top: 8px;
  color: var(--color-danger);
  font-size: 13px;
}

.export-picker {
  margin-top: 12px;
  background: #fafcfb;
}

.export-picker p {
  margin: 0 0 8px;
  font-size: 13px;
}

.export-picker .btn {
  margin-right: 8px;
}
```

- [ ] **Step 3: 增加动效与减少动态偏好**

保留现有 `editor-enter` / `notice-enter`，并在文件末尾追加：

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: 运行完整验证**

Run: `npm test -- --runInBand`
Expected: PASS。

Run: `npm run lint`
Expected: 无错误。

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 5: 提交**

```bash
git add src/sidebar/Sidebar.jsx src/styles/sidebar.css
git commit -m "feat: 分析结果信息网格与页面视觉统一"
```
