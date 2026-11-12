# 教育经历移到个人简介之后 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将教育经历区块移动到个人简介/个人信息之后，编辑器与 PDF/Word 导出一致。

**Architecture:** 纯顺序调整。编辑器移动 JSX section，`resumeHtml` 调整模板插值顺序，`resumeDocx` 移动教育经历生成代码块。数据模型与样式不变。

**Tech Stack:** React 19、Jest + Testing Library、docx、Webpack。

## Global Constraints

- 不修改教育经历字段、保存逻辑或样式。
- 不调整其他区块相对顺序。
- 不执行 `git commit`，除非用户明确要求。

---

### Task 1: 编辑器与 PDF 顺序

**Files:**
- Modify: `src/sidebar/components/ResumeEditor.jsx`（移动 469–565 行的教育经历 section 到 134 行之后）
- Modify: `src/utils/resumeHtml.js`（`${eduHtml}` 移到 `${summaryHtml}` 之后）
- Test: `src/__tests__/ResumeEditor.test.js`
- Test: `src/__tests__/resumeHtml.test.js`

**Interfaces:**
- Consumes: `resumeData.education` 结构与现有一致。
- Produces: `ResumeEditor`、`buildResumeHtml` 签名不变。

- [ ] **Step 1: 加失败测试**

`src/__tests__/ResumeEditor.test.js` 新增：

```js
  test('教育经历位于个人信息之后、工作年限之前', () => {
    render(<ResumeEditor initialData={resume} onSave={jest.fn()} />);
    const headings = screen
      .getAllByRole('heading', { level: 4 })
      .map((node) => node.textContent);
    expect(headings.indexOf('教育经历')).toBeGreaterThan(
      headings.indexOf('个人信息')
    );
    expect(headings.indexOf('教育经历')).toBeLessThan(
      headings.indexOf('工作年限')
    );
  });
```

`src/__tests__/resumeHtml.test.js` 在 `includes school, major and degree` 用例末尾新增：

```js
    expect(html.indexOf('教育经历')).toBeGreaterThan(
      html.indexOf('个人简介')
    );
    expect(html.indexOf('教育经历')).toBeLessThan(html.indexOf('技能'));
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest src/__tests__/ResumeEditor.test.js src/__tests__/resumeHtml.test.js --runInBand`
Expected: FAIL，教育经历仍在工作年限之后且 HTML 中在最后。

- [ ] **Step 3: 移动 `ResumeEditor.jsx` 教育经历区块**

把完整的 `<div className="section">…教育经历…</div>` 从项目经历之后剪切，粘贴到个人信息区块之后、工作年限区块之前。

- [ ] **Step 4: 调整 `resumeHtml.js` 模板**

```js
  ${summaryHtml}
  ${eduHtml}
  ${skillsHtml}
  ${expHtml}
  ${projectsHtml}
  ${companyCandidatesHtml}
  ${strengthsHtml}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npx jest src/__tests__/ResumeEditor.test.js src/__tests__/resumeHtml.test.js --runInBand`
Expected: PASS。

---

### Task 2: Word 导出顺序

**Files:**
- Modify: `src/utils/resumeDocx.js`（把 180–186 行的教育经历代码块移到个人简介之后、技能之前）

**Interfaces:**
- Consumes: `data.education` 结构不变。
- Produces: `buildResumeDocxBlob` 签名不变。

- [ ] **Step 1: 移动教育经历代码块**

把：

```js
  if ((data.education || []).length) {
    children.push(heading('教育经历'));
    data.education.forEach((item) => {
      const details = [item.major, item.degree].filter(Boolean).join(' · ');
      children.push(itemHead(item.school || '', details, item.dates));
    });
  }
```

移动到个人简介生成逻辑之后、技能生成逻辑之前。

- [ ] **Step 2: 运行 docx 测试**

Run: `npx jest src/__tests__/resumeDocx.test.js --runInBand`
Expected: PASS。

---

### Task 3: 全量验证

- [ ] **Step 1: 全量测试**

Run: `npm test -- --runInBand`
Expected: 全部 PASS。

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 无错误。

- [ ] **Step 3: 构建**

Run: `npm run build`
Expected: 编译成功。

---

## Self-Review

- Spec 覆盖：编辑器、PDF、Word 三处顺序均有任务。
- 占位检查：无 TBD/TODO。
- 类型一致性：未改任何数据结构或函数签名。
