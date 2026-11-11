# 保存简历后导出 PDF / Word Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击「保存简历」后先持久化，再让用户选择导出 PDF 或 Word(.docx)。

**Architecture:** 新增 `resumeDocx.js`（纯 docx 文档构建）与 `exportResume.js`（浏览器导出动作），`ResumeEditor` 负责保存后的格式选择 UI，`ExportPanel` 复用同一套导出函数并启用 Word。

**Tech Stack:** React 19、Jest + React Testing Library、Webpack、`docx`（新增依赖）。

## Global Constraints

- Chrome 扩展侧边栏环境，不得依赖服务端生成文件
- 简历数据结构保持 `schemaVersion: 2`，不新增顶层字段
- 「保存」后的格式选项只有 PDF 和 Word；JSON 仍只保留在「导出」页签
- 文案必须与 spec 一致：`已保存到本地，请选择导出格式`、`请先在编辑器中填写简历信息。`、`请允许弹窗后重试`、`导出失败: `
- 不要自动执行 `git commit`；每个任务以对应测试通过为完成标准，提交由用户决定
- 所有导入使用项目现有风格（工具函数之间可带 `.js` 后缀）

---

### Task 1: 用 docx 库构建文档 Blob

**Files:**
- Create: `src/utils/resumeDocx.js`
- Test: `src/__tests__/resumeDocx.test.js`
- Modify: `package.json`, `package-lock.json`（安装依赖）

**Interfaces:**
- Consumes: 无
- Produces: `buildResumeDocxBlob(resumeData): Promise<Blob>`，Blob 类型为 `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

- [ ] **Step 1: 安装 docx 依赖**

Run:
```bash
npm install docx
```
Expected: `package.json` 的 `dependencies` 中出现 `docx`，命令退出码 0。

- [ ] **Step 2: 写失败的测试**

Create `src/__tests__/resumeDocx.test.js`:

```js
import { buildResumeDocxBlob } from '../utils/resumeDocx';

const sample = {
  schemaVersion: 2,
  personalInfo: {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '13800000000',
    summary: '后端工程师',
  },
  skills: ['Java', 'Redis'],
  experienceSummary: { totalYears: '5年', industryYears: '3年', industry: '电商' },
  experience: [
    {
      company: '示例科技',
      title: '后端工程师',
      dates: '2020.01 - 2025.01',
      location: '上海',
      description: '负责订单服务',
      responsibilities: ['维护订单链路'],
      achievements: ['接口延迟降低 20%'],
      userConfirmed: true,
    },
  ],
  projects: [],
  companyCandidates: [],
  strengths: [],
  education: [{ school: '某大学', major: '计算机', degree: '本科', dates: '2016 - 2020' }],
};

test('生成有效的 docx Blob', async () => {
  const blob = await buildResumeDocxBlob(sample);

  expect(blob).toBeInstanceOf(Blob);
  expect(blob.type).toBe(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  expect(blob.size).toBeGreaterThan(0);
});

test('空简历也能生成 Blob（姓名使用默认值）', async () => {
  const blob = await buildResumeDocxBlob({});

  expect(blob.size).toBeGreaterThan(0);
});
```

- [ ] **Step 3: 运行测试确认失败**

Run:
```bash
npx jest src/__tests__/resumeDocx.test.js --runInBand
```
Expected: FAIL，报错 `Cannot find module '../utils/resumeDocx'`。

- [ ] **Step 4: 实现 resumeDocx.js**

Create `src/utils/resumeDocx.js`:

```js
import { Document, Packer, Paragraph, TextRun, BorderStyle } from 'docx';

const FONT = 'Microsoft YaHei';

function text(value, options = {}) {
  return new TextRun({
    text: String(value ?? ''),
    font: FONT,
    size: options.size ?? 22,
    bold: options.bold,
    color: options.color,
  });
}

function heading(value) {
  return new Paragraph({
    spacing: { before: 240, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 },
    },
    children: [text(value, { size: 28, bold: true })],
  });
}

function paragraph(value, options = {}) {
  return new Paragraph({
    spacing: { after: options.after ?? 80 },
    children: [text(value, options)],
  });
}

function bullets(items) {
  return (items || [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .map(
      (item) =>
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [text(item, { size: 20 })],
        })
    );
}

function itemHead(primary, secondary, dates) {
  const parts = [];
  if (primary) parts.push(text(primary, { bold: true }));
  if (secondary) parts.push(text(` ${secondary}`));
  if (dates) parts.push(text(`    ${dates}`, { color: '666666' }));
  return new Paragraph({ spacing: { after: 40 }, children: parts });
}

function buildResumeDocChildren(resumeData) {
  const data = resumeData || {};
  const info = data.personalInfo || {};
  const summary = data.experienceSummary || {};
  const children = [];

  children.push(
    new Paragraph({
      spacing: { after: 60 },
      children: [text(info.name || '未命名', { size: 44, bold: true })],
    })
  );

  const contact = [info.email, info.phone].filter(Boolean).join(' · ');
  if (contact) children.push(paragraph(contact, { size: 20, color: '444444' }));

  const years = [];
  if (summary.totalYears) years.push(`总工作年限：${summary.totalYears}`);
  if (summary.industryYears) {
    years.push(
      `相关行业经验：${summary.industryYears}${summary.industry ? `（${summary.industry}）` : ''}`
    );
  }
  if (years.length) {
    children.push(paragraph(years.join(' · '), { size: 20, color: '444444' }));
  }

  if (info.summary) {
    children.push(heading('个人简介'));
    children.push(paragraph(info.summary));
  }

  if ((data.skills || []).length) {
    children.push(heading('技能'));
    children.push(paragraph(data.skills.join(' · ')));
  }

  if ((data.experience || []).length) {
    children.push(heading('工作经历'));
    data.experience.forEach((item) => {
      const status = item.userConfirmed ? '已核实' : '工作经历草稿 · 待核实';
      children.push(
        itemHead(
          item.company || '未命名公司',
          item.title ? `· ${item.title}` : '',
          item.dates
        )
      );
      children.push(
        paragraph(
          `${status}${item.location ? ` · ${item.location}` : ''}`,
          { size: 18, color: '8A5A00' }
        )
      );
      if (item.description) children.push(paragraph(item.description));
      if ((item.responsibilities || []).length) {
        children.push(paragraph('主要职责', { size: 20, color: '555555' }));
        children.push(...bullets(item.responsibilities));
      }
      if ((item.achievements || []).length) {
        children.push(paragraph('工作成果', { size: 20, color: '555555' }));
        children.push(...bullets(item.achievements));
      }
    });
  }

  if ((data.projects || []).length) {
    children.push(heading('项目经历'));
    data.projects.forEach((item) => {
      const status = item.userConfirmed ? '已核实' : '示例项目 · 请按实际修改';
      children.push(
        itemHead(item.name || '', item.role ? `(${item.role})` : '', item.dates)
      );
      children.push(paragraph(status, { size: 18, color: '8A5A00' }));
      if ((item.techStack || []).length) {
        children.push(
          paragraph(item.techStack.join(' · '), { size: 20, color: '555555' })
        );
      }
      if (item.description) children.push(paragraph(item.description));
      if ((item.achievements || []).length) {
        children.push(paragraph('项目成果', { size: 20, color: '555555' }));
        children.push(...bullets(item.achievements));
      }
    });
  }

  if ((data.companyCandidates || []).length) {
    children.push(heading('候选公司经历（待核实）'));
    children.push(
      paragraph(
        '以下公司仅为岗位匹配候选，不代表真实任职经历，请按实际情况核实。',
        { size: 18, color: '8A5A00' }
      )
    );
    data.companyCandidates.forEach((item) => {
      const status = item.userConfirmed ? '已核实' : '候选公司 · 待核实';
      children.push(
        itemHead(
          item.company || '',
          item.role ? `@ ${item.role}` : '',
          item.location
        )
      );
      children.push(
        paragraph(`${status}${item.industry ? ` · ${item.industry}` : ''}`, {
          size: 18,
          color: '8A5A00',
        })
      );
      if (item.matchReason) children.push(paragraph(item.matchReason));
      if ((item.suggestedResponsibilities || []).length) {
        children.push(paragraph('建议职责', { size: 20, color: '555555' }));
        children.push(...bullets(item.suggestedResponsibilities));
      }
    });
  }

  if ((data.strengths || []).length) {
    children.push(heading('个人优势（请按实际核实）'));
    data.strengths.forEach((item) => {
      const status = item.userConfirmed ? '已核实' : '优势草稿 · 待核实';
      children.push(itemHead(item.title || ''));
      children.push(paragraph(status, { size: 18, color: '8A5A00' }));
      if (item.description) children.push(paragraph(item.description));
      if ((item.keywords || []).length) {
        children.push(
          paragraph(item.keywords.join(' · '), { size: 20, color: '555555' })
        );
      }
      if ((item.evidenceSuggestions || []).length) {
        children.push(paragraph('证据建议', { size: 20, color: '555555' }));
        children.push(...bullets(item.evidenceSuggestions));
      }
    });
  }

  if ((data.education || []).length) {
    children.push(heading('教育经历'));
    data.education.forEach((item) => {
      const details = [item.major, item.degree].filter(Boolean).join(' · ');
      children.push(itemHead(item.school || '', details, item.dates));
    });
  }

  return children;
}

export async function buildResumeDocxBlob(resumeData) {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 } },
      },
    },
    sections: [{ properties: {}, children: buildResumeDocChildren(resumeData) }],
  });

  return Packer.toBlob(doc);
}

export { buildResumeDocChildren };
```

- [ ] **Step 5: 运行测试确认通过**

Run:
```bash
npx jest src/__tests__/resumeDocx.test.js --runInBand
```
Expected: PASS（2 个测试）。若 `blob.type` 断言失败，先打印 `blob.type` 确认 docx 库实际 MIME，再同步修改测试与实现约定，不要删除 MIME 断言。

---

### Task 2: 浏览器端导出动作

**Files:**
- Create: `src/utils/exportResume.js`
- Test: `src/__tests__/exportResume.test.js`

**Interfaces:**
- Consumes: `buildResumeHtml(resumeData)`（`src/utils/resumeHtml.js`）、`buildResumeDocxBlob(resumeData)`（Task 1）
- Produces:
  - `hasResumeContent(resumeData): boolean`
  - `exportResumePdf(resumeData, options?): boolean`
  - `exportResumeDocx(resumeData, options?): Promise<boolean>`
  - `options` 可注入 `{ window, document, alert, createObjectURL }` 以便测试

- [ ] **Step 1: 写失败的测试**

Create `src/__tests__/exportResume.test.js`:

```js
import {
  hasResumeContent,
  exportResumePdf,
  exportResumeDocx,
} from '../utils/exportResume';

jest.mock('../utils/resumeDocx', () => ({
  buildResumeDocxBlob: jest.fn(() =>
    Promise.resolve(
      new Blob(['docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    )
  ),
}));

const sample = {
  personalInfo: { name: '张三', email: 'a@b.com', phone: '138' },
  skills: ['Java'],
  experience: [],
  projects: [],
  education: [],
};

function fakePrintWindow() {
  return {
    document: {
      open: jest.fn(),
      write: jest.fn(),
      close: jest.fn(),
      readyState: 'complete',
    },
    focus: jest.fn(),
    print: jest.fn(),
    close: jest.fn(),
    onafterprint: null,
  };
}

test('hasResumeContent 判断是否有内容', () => {
  expect(hasResumeContent(null)).toBe(false);
  expect(hasResumeContent({ personalInfo: {} })).toBe(false);
  expect(hasResumeContent(sample)).toBe(true);
});

test('PDF 导出写入 HTML 并调用打印', () => {
  const printWindow = fakePrintWindow();
  const alert = jest.fn();
  const open = jest.fn(() => printWindow);

  const ok = exportResumePdf(sample, { window: { open }, alert });

  expect(ok).toBe(true);
  expect(open).toHaveBeenCalledWith('', '_blank');
  expect(printWindow.document.write).toHaveBeenCalledWith(
    expect.stringContaining('张三')
  );
  expect(printWindow.print).toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});

test('PDF 弹窗被拦截时提示', () => {
  const alert = jest.fn();
  const ok = exportResumePdf(sample, {
    window: { open: jest.fn(() => null) },
    alert,
  });

  expect(ok).toBe(false);
  expect(alert).toHaveBeenCalledWith('请允许弹窗后重试');
});

test('空内容时不导出并提示', () => {
  const alert = jest.fn();
  const ok = exportResumePdf({}, { window: { open: jest.fn() }, alert });

  expect(ok).toBe(false);
  expect(alert).toHaveBeenCalledWith('请先在编辑器中填写简历信息。');
});

test('Word 导出下载 .docx 文件', async () => {
  const click = jest.fn();
  const remove = jest.fn();
  const link = { href: '', download: '', click, remove };
  const doc = {
    createElement: jest.fn(() => link),
    body: { appendChild: jest.fn() },
  };
  const alert = jest.fn();
  const createObjectURL = jest.fn(() => 'blob:mock');

  const ok = await exportResumeDocx(sample, {
    document: doc,
    alert,
    createObjectURL,
  });

  expect(ok).toBe(true);
  expect(createObjectURL).toHaveBeenCalled();
  expect(link.href).toBe('blob:mock');
  expect(link.download).toBe('简历-张三.docx');
  expect(click).toHaveBeenCalled();
  expect(remove).toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
npx jest src/__tests__/exportResume.test.js --runInBand
```
Expected: FAIL，报错 `Cannot find module '../utils/exportResume'`。

- [ ] **Step 3: 实现 exportResume.js**

Create `src/utils/exportResume.js`:

```js
import { buildResumeHtml } from './resumeHtml.js';
import { buildResumeDocxBlob } from './resumeDocx.js';

export function hasResumeContent(data) {
  if (!data) return false;
  const info = data.personalInfo || {};
  return Boolean(
    info.name ||
      info.summary ||
      info.email ||
      info.phone ||
      (data.skills && data.skills.length) ||
      (data.experience && data.experience.length) ||
      (data.projects && data.projects.length) ||
      (data.companyCandidates && data.companyCandidates.length) ||
      (data.strengths && data.strengths.length) ||
      (data.education && data.education.length)
  );
}

function resumeFileName(resumeData, extension) {
  const raw = String(resumeData?.personalInfo?.name || '').trim();
  const safe = raw.replace(/[\\/:*?"<>|]/g, '_') || '未命名';
  return `简历-${safe}.${extension}`;
}

function resolveAlert(alertFn) {
  if (typeof alertFn === 'function') return alertFn;
  if (typeof alert !== 'undefined') return alert;
  return () => {};
}

export function exportResumePdf(resumeData, options = {}) {
  const alertFn = resolveAlert(options.alert);
  const win =
    options.window || (typeof window !== 'undefined' ? window : undefined);

  if (!hasResumeContent(resumeData)) {
    alertFn('请先在编辑器中填写简历信息。');
    return false;
  }
  if (!win || typeof win.open !== 'function') {
    alertFn('当前环境不支持导出 PDF');
    return false;
  }

  try {
    const html = buildResumeHtml(resumeData);
    const printWindow = win.open('', '_blank');
    if (!printWindow) {
      alertFn('请允许弹窗后重试');
      return false;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const doPrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        try {
          printWindow.close();
        } catch {
          /* ignore */
        }
      };
    };

    if (printWindow.document.readyState === 'complete') {
      doPrint();
    } else {
      printWindow.onload = doPrint;
    }
    return true;
  } catch (error) {
    console.error('PDF导出失败:', error);
    alertFn('PDF导出失败: ' + error.message);
    return false;
  }
}

export async function exportResumeDocx(resumeData, options = {}) {
  const alertFn = resolveAlert(options.alert);
  const doc =
    options.document || (typeof document !== 'undefined' ? document : undefined);

  if (!hasResumeContent(resumeData)) {
    alertFn('请先在编辑器中填写简历信息。');
    return false;
  }

  try {
    const blob = await buildResumeDocxBlob(resumeData);
    const createObjectURL =
      options.createObjectURL ||
      (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL.bind(URL)
        : null);

    if (!createObjectURL || !doc) {
      throw new Error('当前环境不支持文件下载');
    }

    const url = createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = resumeFileName(resumeData, 'docx');
    doc.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }, 0);

    return true;
  } catch (error) {
    console.error('Word导出失败:', error);
    alertFn('导出失败: ' + error.message);
    return false;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
npx jest src/__tests__/exportResume.test.js --runInBand
```
Expected: PASS（5 个测试）。

---

### Task 3: 保存后显示格式选择（ResumeEditor + Sidebar）

**Files:**
- Modify: `src/sidebar/components/ResumeEditor.jsx:79`（`handleSave`）及文件末尾按钮区域 `:779-781`
- Modify: `src/sidebar/Sidebar.jsx:92-101`（`handleSaveResume` 让错误向上抛）
- Modify: `src/styles/sidebar.css`（新增样式）
- Test: `src/__tests__/ResumeEditor.test.js`

**Interfaces:**
- Consumes: `exportResumePdf`、`exportResumeDocx`（Task 2）
- Produces: 无（内部 UI 行为）

- [ ] **Step 1: 写失败的测试**

在 `src/__tests__/ResumeEditor.test.js` 顶部（`ResumeEditor` require 之前）加入 mock：

```js
jest.mock('../utils/exportResume', () => ({
  exportResumePdf: jest.fn(),
  exportResumeDocx: jest.fn(),
}));

const { exportResumePdf, exportResumeDocx } = require('../utils/exportResume');
```

在 `describe('ResumeEditor v2', ...)` 内新增测试：

```js
test('保存成功后显示格式选择并可导出 PDF', async () => {
  const onSave = jest.fn().mockResolvedValue(true);
  render(<ResumeEditor initialData={resume} onSave={onSave} />);

  fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

  expect(
    await screen.findByText('已保存到本地，请选择导出格式')
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '导出 PDF' }));
  expect(exportResumePdf).toHaveBeenCalledTimes(1);
});

test('保存成功后可选导出 Word', async () => {
  const onSave = jest.fn().mockResolvedValue(true);
  render(<ResumeEditor initialData={resume} onSave={onSave} />);

  fireEvent.click(screen.getByRole('button', { name: '保存简历' }));
  await screen.findByText('已保存到本地，请选择导出格式');
  fireEvent.click(screen.getByRole('button', { name: '导出 Word' }));

  expect(exportResumeDocx).toHaveBeenCalledTimes(1);
});

test('保存失败时显示错误且不显示格式选择', async () => {
  const onSave = jest.fn().mockRejectedValue(new Error('存储不可用'));
  render(<ResumeEditor initialData={resume} onSave={onSave} />);

  fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('存储不可用');
  expect(
    screen.queryByText('已保存到本地，请选择导出格式')
  ).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
npx jest src/__tests__/ResumeEditor.test.js --runInBand
```
Expected: 新增 3 个测试 FAIL（找不到「已保存到本地，请选择导出格式」或 alert）。

- [ ] **Step 3: 修改 Sidebar.handleSaveResume**

把 `src/sidebar/Sidebar.jsx:92-101` 替换为：

```jsx
  const handleSaveResume = async (data) => {
    await saveResume(data);
    setResumeData(data);
  };
```

说明：错误不再在 Sidebar 内吞掉，由 `ResumeEditor` 捕获并内联展示，因此旧的两个 `alert` 一并移除。

- [ ] **Step 4: 修改 ResumeEditor 保存流程**

在 `src/sidebar/components/ResumeEditor.jsx` 顶部导入：

```jsx
import { exportResumePdf, exportResumeDocx } from '../../utils/exportResume';
```

在 `ResumeEditor` 组件内、`handleSave` 之前加入状态：

```jsx
  const [saveState, setSaveState] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const [showExportPicker, setShowExportPicker] = useState(false);
```

把 `const handleSave = () => onSave(normalizeResume(resumeData));`（`:79`）替换为：

```jsx
  const handleSave = async () => {
    setSaveError('');
    setShowExportPicker(false);
    setSaveState('saving');
    try {
      await onSave(normalizeResume(resumeData));
      setSaveState('saved');
      setShowExportPicker(true);
    } catch (error) {
      setSaveState('error');
      setSaveError(error.message || '保存失败');
    }
  };

  const handleExport = async (format) => {
    if (format === 'pdf') {
      exportResumePdf(resumeData);
    } else if (format === 'docx') {
      await exportResumeDocx(resumeData);
    }
    setShowExportPicker(false);
  };
```

把文件末尾的保存按钮（`:779-781`）替换为：

```jsx
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saveState === 'saving'}
      >
        {saveState === 'saving' ? '保存中...' : '保存简历'}
      </button>

      {saveState === 'error' && (
        <p className="save-error" role="alert">
          {saveError}
        </p>
      )}

      {showExportPicker && (
        <div className="export-picker">
          <p>已保存到本地，请选择导出格式</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleExport('pdf')}
          >
            导出 PDF
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleExport('docx')}
          >
            导出 Word
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowExportPicker(false)}
          >
            取消
          </button>
        </div>
      )}
```

- [ ] **Step 5: 添加样式**

在 `src/styles/sidebar.css` 末尾追加：

```css
.save-error {
  color: #c0392b;
  font-size: 13px;
  margin-top: 8px;
}

.export-picker {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
}

.export-picker p {
  margin: 0 0 8px;
  font-size: 13px;
}

.export-picker .btn {
  margin-right: 8px;
}
```

- [ ] **Step 6: 运行测试确认通过**

Run:
```bash
npx jest src/__tests__/ResumeEditor.test.js --runInBand
```
Expected: PASS（原有测试与新增 3 个测试全部通过）。

---

### Task 4: 导出页签复用并启用 Word

**Files:**
- Modify: `src/sidebar/components/ExportPanel.jsx`
- Test: `src/__tests__/ExportPanel.test.js`

**Interfaces:**
- Consumes: `exportResumePdf`、`exportResumeDocx`（Task 2）
- Produces: 「导出为Word」按钮可用

- [ ] **Step 1: 更新测试为期望 Word 可用**

把 `src/__tests__/ExportPanel.test.js` 全文替换为：

```js
require('@testing-library/jest-dom');
const { render, screen } = require('@testing-library/react');

jest.mock('../utils/exportResume', () => ({
  exportResumePdf: jest.fn(),
  exportResumeDocx: jest.fn(),
}));

const ExportPanel = require('../sidebar/components/ExportPanel').default;

test('Word 导出按钮可用', () => {
  render(
    <ExportPanel
      resumeData={{
        personalInfo: { name: '张三' },
        companyCandidates: [{ company: '示例科技' }],
        strengths: [{ title: '执行力' }],
      }}
    />
  );

  const button = screen.getByRole('button', { name: '导出为Word' });
  expect(button).toBeEnabled();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
npx jest src/__tests__/ExportPanel.test.js --runInBand
```
Expected: FAIL，找不到名为「导出为Word」的按钮（当前为「导出为Word（暂未支持）」且 disabled）。

- [ ] **Step 3: 修改 ExportPanel**

把 `src/sidebar/components/ExportPanel.jsx` 全文替换为：

```jsx
import React from 'react'; // eslint-disable-line no-unused-vars
import {
  exportResumePdf,
  exportResumeDocx,
} from '../../utils/exportResume';

const ExportPanel = ({ resumeData }) => {
  const exportAsJSON = () => {
    const dataStr = JSON.stringify(resumeData, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'resume.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="export-panel">
      <h3>导出简历</h3>

      <div className="export-options">
        <button className="btn btn-primary" onClick={exportAsJSON}>
          导出为JSON
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => exportResumePdf(resumeData)}
        >
          导出为PDF
        </button>

        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => exportResumeDocx(resumeData)}
        >
          导出为Word
        </button>
      </div>

      <div className="export-preview">
        <h4>预览</h4>
        {resumeData ? (
          <pre>{JSON.stringify(resumeData, null, 2)}</pre>
        ) : (
          <p>暂无简历数据，请先在编辑器中填写简历信息。</p>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
npx jest src/__tests__/ExportPanel.test.js --runInBand
```
Expected: PASS。

---

### Task 5: 全量验证

**Files:**
- 无新增文件；修复前四步暴露的问题

**Interfaces:**
- Consumes: Task 1–4 的全部产物
- Produces: 可构建、测试与 lint 全部通过

- [ ] **Step 1: 运行全部测试**

Run:
```bash
npm test -- --runInBand
```
Expected: 全部 PASS。特别确认 `resumeDocx`、`exportResume`、`ResumeEditor`、`ExportPanel`、`Sidebar`、`storage` 相关测试无失败。

- [ ] **Step 2: 运行 lint**

Run:
```bash
npm run lint
```
Expected: 退出码 0，无 error。

- [ ] **Step 3: 运行构建**

Run:
```bash
npm run build
```
Expected: webpack 构建成功，`dist/` 生成；确认 `dist/manifest.json` 仍包含 `http://localhost:3000/*`。

- [ ] **Step 4: 手动冒烟（本地）**

前提：`npm run dev:api` 已在 `http://localhost:3000` 运行，Chrome 已加载 `dist`。

1. 打开侧边栏 →「简历编辑」→ 填写姓名
2. 点击「保存简历」
3. 期望：出现「已保存到本地，请选择导出格式」
4. 点击「导出 PDF」→ 打开打印窗口，内容含姓名
5. 再次保存 →「导出 Word」→ 下载 `简历-<姓名>.docx`，用 Word/WPS 能打开
6. 切到「导出」页签 → 「导出为Word」按钮可用

---

## Self-Review

- Spec coverage: 保存后持久化、格式选择、PDF、Word(.docx)、ExportPanel 复用并启用 Word、空内容/弹窗/生成失败提示均有对应任务。
- Placeholder scan: 无 TBD/TODO；每个代码步骤均给出完整代码。
- Type consistency: `buildResumeDocxBlob`、`hasResumeContent`、`exportResumePdf`、`exportResumeDocx` 在 Task 1/2/3/4 中签名与命名一致。
