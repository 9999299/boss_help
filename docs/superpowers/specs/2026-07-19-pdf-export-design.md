# PDF Export Design

**Date:** 2026-07-19  
**Status:** Approved for implementation  
**Scope:** Chrome extension sidebar — export resume as PDF only

## Problem

「导出为PDF」 currently shows `PDF导出功能开发中...`. Users need a real, usable PDF of the resume after AI analysis and editing.

## Goals

- Export the current `resumeData` as a printable PDF
- Clean single-column layout suitable for job applications
- No new heavy dependencies; Chinese text must render correctly
- Clear empty-state and error handling

## Non-Goals

- Word export (remains “开发中”)
- Dual-column / fancy templates
- Server-side PDF generation
- Perfect WYSIWYG of arbitrary custom HTML

## Approach (chosen)

**Browser print-to-PDF**

1. User clicks「导出为PDF」
2. Extension builds a self-contained HTML document (inline CSS) from `resumeData`
3. Open a temporary window/tab with that HTML
4. Call `window.print()` so the user chooses「存储为 PDF」
5. Close the temporary window after print dialog is dismissed (best-effort)

### Why this approach

| Option | Pros | Cons |
|--------|------|------|
| **Print-to-PDF (chosen)** | No deps, Chinese OK, small bundle, selectable text | Extra print dialog step |
| jspdf | One-click file download | Font packing for Chinese, larger bundle |
| html2canvas + jspdf | Visual fidelity | Large files, non-selectable text |

## Resume layout (single column)

1. **Header:** name (large), email · phone
2. **个人简介:** summary paragraph
3. **技能:** comma-separated or tag-like list
4. **工作经历:** title, company, dates, description (if present)
5. **教育经历:** school, degree, dates (if present)

Missing sections are omitted (not shown empty).  
If there is no `resumeData` (or no name and no skills/summary), show alert: 请先在编辑器中填写简历信息。

## Architecture

```
ExportPanel.exportAsPDF()
  → validate resumeData
  → buildResumeHtml(resumeData)   // pure function, easy to test
  → open print window + document.write(html)
  → printWindow.print()
  → printWindow.close() (after onafterprint or short timeout)
```

### Files

| File | Change |
|------|--------|
| `src/sidebar/components/ExportPanel.jsx` | Implement `exportAsPDF`; wire HTML builder |
| `src/utils/resumeHtml.js` (new) | `buildResumeHtml(resumeData)` + escape HTML |
| `src/__tests__/resumeHtml.test.js` (new) | Unit tests for HTML output / escaping |
| Word button | Unchanged placeholder |

### Print styles (inline in HTML)

- A4-friendly width (~700px content), white background, black text
- System font stack with Chinese fallbacks: `"PingFang SC", "Microsoft YaHei", sans-serif`
- Clear section headings with bottom border
- `@media print` hide nothing critical; margins ~12–16mm

### Security

- Escape all user strings before injecting into HTML (`&`, `<`, `>`, `"`, `'`)
- No external scripts or stylesheets in the print document

### Error handling

- No data → alert, do not open window
- `window.open` blocked → alert 请允许弹窗后重试
- Other failures → alert with message + `console.error`

## Data shape (existing)

```js
{
  personalInfo: { name, email, phone, summary },
  skills: string[],
  experience: Array<{ title?, company?, dates?, description? }>,
  education: Array<{ school?, degree?, dates? }>
}
```

Fields may be empty arrays/strings; template must tolerate that.

## Testing

- Unit: `buildResumeHtml` escapes XSS-like input; includes name/skills when present; omits empty sections
- Manual: load extension → fill resume → 导出为PDF → print dialog → 存储为 PDF → open file and verify Chinese + layout

## Success criteria

- Clicking「导出为PDF」 opens print dialog with formatted single-column resume
- User can save as PDF without console errors
- Chinese characters display correctly
- Empty resume does not open a blank print window
