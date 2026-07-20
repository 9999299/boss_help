# PDF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement print-to-PDF export of resume data as a clean single-column Chinese-friendly document.

**Architecture:** Pure `buildResumeHtml(resumeData)` builds escaped HTML with inline print CSS. `ExportPanel.exportAsPDF` validates data, opens a temporary window, writes HTML, calls `print()`, then closes.

**Tech Stack:** React (classic JSX), Jest, no new dependencies.

## Global Constraints

- No new npm packages (print-to-PDF only)
- Escape all user strings in HTML
- Word export stays as placeholder
- Chinese font stack: `"PingFang SC", "Microsoft YaHei", sans-serif`

---

### Task 1: buildResumeHtml + unit tests

**Files:**
- Create: `src/utils/resumeHtml.js`
- Create: `src/__tests__/resumeHtml.test.js`

**Interfaces:**
- Produces: `buildResumeHtml(resumeData: object) => string`
- Produces: `escapeHtml(str: string) => string` (exported for tests optional; can be internal)

- [ ] **Step 1: Write failing tests**

```js
import { buildResumeHtml } from '../utils/resumeHtml';

describe('buildResumeHtml', () => {
  const sample = {
    personalInfo: {
      name: '张三',
      email: 'a@b.com',
      phone: '13800000000',
      summary: '3年经验',
    },
    skills: ['React', 'Node'],
    experience: [{ title: '前端', company: 'A公司', dates: '2020-2023', description: '负责前端' }],
    education: [{ school: '某大学', degree: '本科', dates: '2016-2020' }],
  };

  test('includes name and skills', () => {
    const html = buildResumeHtml(sample);
    expect(html).toContain('张三');
    expect(html).toContain('React');
    expect(html).toContain('个人简介');
  });

  test('escapes HTML in user fields', () => {
    const html = buildResumeHtml({
      personalInfo: { name: '<script>x</script>', email: '', phone: '', summary: '' },
      skills: [],
      experience: [],
      education: [],
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('omits empty experience section', () => {
    const html = buildResumeHtml({
      personalInfo: { name: '李四', email: '', phone: '', summary: '' },
      skills: [],
      experience: [],
      education: [],
    });
    expect(html).toContain('李四');
    expect(html).not.toContain('工作经历');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- src/__tests__/resumeHtml.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `src/utils/resumeHtml.js`**

```js
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildResumeHtml(resumeData) {
  const info = resumeData?.personalInfo || {};
  const skills = resumeData?.skills || [];
  const experience = resumeData?.experience || [];
  const education = resumeData?.education || [];

  const name = escapeHtml(info.name || '未命名');
  const email = escapeHtml(info.email || '');
  const phone = escapeHtml(info.phone || '');
  const summary = escapeHtml(info.summary || '');

  const contact = [email, phone].filter(Boolean).join(' · ');

  const skillsHtml =
    skills.length > 0
      ? `<section><h2>技能</h2><p>${skills.map(escapeHtml).join(' · ')}</p></section>`
      : '';

  const summaryHtml = summary
    ? `<section><h2>个人简介</h2><p>${summary}</p></section>`
    : '';

  const expHtml =
    experience.length > 0
      ? `<section><h2>工作经历</h2>${experience
          .map((e) => {
            const title = escapeHtml(e.title || '');
            const company = escapeHtml(e.company || '');
            const dates = escapeHtml(e.dates || '');
            const desc = escapeHtml(e.description || '');
            return `<div class="item"><div class="item-head"><strong>${title}</strong> ${company ? `@ ${company}` : ''} <span class="dates">${dates}</span></div>${desc ? `<p>${desc}</p>` : ''}</div>`;
          })
          .join('')}</section>`
      : '';

  const eduHtml =
    education.length > 0
      ? `<section><h2>教育经历</h2>${education
          .map((e) => {
            const school = escapeHtml(e.school || '');
            const degree = escapeHtml(e.degree || '');
            const dates = escapeHtml(e.dates || '');
            return `<div class="item"><div class="item-head"><strong>${school}</strong> ${degree} <span class="dates">${dates}</span></div></div>`;
          })
          .join('')}</section>`
      : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${name} - 简历</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
    color: #111;
    background: #fff;
    margin: 0;
    padding: 24px;
    max-width: 700px;
  }
  h1 { font-size: 28px; margin: 0 0 8px; }
  .contact { color: #444; margin-bottom: 20px; font-size: 14px; }
  h2 {
    font-size: 16px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin: 20px 0 10px;
  }
  p { margin: 0 0 8px; line-height: 1.6; font-size: 14px; }
  .item { margin-bottom: 12px; }
  .item-head { font-size: 14px; margin-bottom: 4px; }
  .dates { color: #666; float: right; font-weight: normal; }
  @media print {
    body { padding: 0; max-width: none; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <h1>${name}</h1>
  ${contact ? `<div class="contact">${contact}</div>` : ''}
  ${summaryHtml}
  ${skillsHtml}
  ${expHtml}
  ${eduHtml}
</body>
</html>`;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- src/__tests__/resumeHtml.test.js`
Expected: PASS

---

### Task 2: Wire ExportPanel PDF button

**Files:**
- Modify: `src/sidebar/components/ExportPanel.jsx`

**Interfaces:**
- Consumes: `buildResumeHtml(resumeData) => string`

- [ ] **Step 1: Implement exportAsPDF**

```js
import React from 'react';
import { buildResumeHtml } from '../../utils/resumeHtml';

const ExportPanel = ({ resumeData }) => {
  const hasResumeContent = (data) => {
    if (!data) return false;
    const info = data.personalInfo || {};
    return Boolean(
      info.name ||
        info.summary ||
        info.email ||
        info.phone ||
        (data.skills && data.skills.length) ||
        (data.experience && data.experience.length) ||
        (data.education && data.education.length)
    );
  };

  const exportAsJSON = () => { /* existing */ };

  const exportAsPDF = () => {
    if (!hasResumeContent(resumeData)) {
      alert('请先在编辑器中填写简历信息。');
      return;
    }
    try {
      const html = buildResumeHtml(resumeData);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('请允许弹窗后重试');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      };
      // Fallback if onload already fired
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          /* ignore */
        }
      }, 300);
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败: ' + error.message);
    }
  };

  const exportAsWord = async () => {
    alert('Word导出功能开发中...');
  };

  // rest unchanged — buttons call exportAsPDF
};
```

Note: Prefer a single print trigger — use `printWindow.onload` OR short timeout, not both firing twice. Implementation should print once:

```js
printWindow.document.write(html);
printWindow.document.close();
const doPrint = () => {
  printWindow.focus();
  printWindow.print();
  printWindow.onafterprint = () => {
    try { printWindow.close(); } catch (e) { /* ignore */ }
  };
};
if (printWindow.document.readyState === 'complete') {
  doPrint();
} else {
  printWindow.onload = doPrint;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiled successfully

- [ ] **Step 3: Manual check**

Reload extension → 导出 → 导出为PDF → print dialog with resume layout.

---

### Task 3: Verify

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all pass including new resumeHtml tests

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: clean or only pre-existing issues
