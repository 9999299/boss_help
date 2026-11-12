# 简历编辑页整段重写 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在简历编辑页为每段工作/项目经历提供按岗位整段重写，并通过服务端真实性校验。

**Architecture:** 新增无状态 `rewriteExperience` 服务端模块与 `POST /api/v1/rewrite-experience`；把该段原文构造为合成证据交给现有 `reviewDraft`。前端将 `analysisResult` 传入 `ResumeEditor`，重写成功后只更新本地条目字段。

**Tech Stack:** React 19、Node/Vercel Functions、Jest、OpenAI-compatible model。

## Global Constraints

- 教育经历不提供重写。
- 没有岗位分析结果时按钮禁用并提示「请先完成岗位分析，再重新生成」。
- 重写只替换 `description`、`responsibilities`、`achievements`，公司、职位、时间、地点、技术栈保持不变。
- 任意一条生成文本未通过真实性校验，整段重写失败，不覆盖原文。
- 不创建生成记录，不修改数据库结构。
- 不执行 `git commit`，除非用户明确要求。

---

### Task 1: 服务端无状态重写

**Files:**
- Modify: `server/agent/writer.cjs:181-220`
- Create: `server/agent/rewrite.cjs`
- Modify: `server/api/v1.cjs:23-29,650-670`
- Test: `api/__tests__/rewrite-experience.test.js`

**Interfaces:**
- Consumes: `WRITER_SYSTEM_PROMPT`、`parseJsonContent`、`reviewDraft`。
- Produces:
  - `buildRewriteExperiencePrompt({ jobAnalysis, kind, experience, userFeedback })`
  - `rewriteExperience({ model, kind, jobAnalysis, experience, userFeedback })` 返回 `{ description, responsibilities, achievements }`
  - `POST /api/v1/rewrite-experience`

- [ ] **Step 1: 写服务端失败测试**

Create `api/__tests__/rewrite-experience.test.js`:

```js
/**
 * @jest-environment node
 */

const { createMemoryRepository } = require('../../server/repositories/memory.cjs');
const { createSessionToken } = require('../../server/auth.cjs');
const { createV1Handler } = require('../../server/api/v1.cjs');

const ctx = { tenantId: 'tenant_a', userId: 'user_a' };
const jobAnalysis = {
  position: 'Go 后端工程师',
  coreRequirements: ['Go', 'Gin', 'MySQL', 'Redis'],
};

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
}

function apiCall(handler, { method, path, body, token }) {
  const res = createResponse();
  return handler(
    {
      method,
      url: `/api/v1${path}`,
      query: { path: path.replace(/^\//, '').split('/') },
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body,
    },
    res
  ).then(() => res);
}

function modelFor(response) {
  const calls = [];
  return {
    calls,
    async completeText(args) {
      calls.push(args);
      return JSON.stringify(response);
    },
  };
}

function handlerWith(model) {
  return createV1Handler({
    repository: createMemoryRepository(),
    model,
    autoProcess: false,
  });
}

const workExperience = {
  company: '某云服务公司',
  title: 'Go 后端工程师',
  dates: '2021.03 - 2023.06',
  location: '上海',
  description: '负责订单服务后端开发',
  responsibilities: [
    '使用 Go 和 Gin 开发订单服务',
    '使用 MySQL 和 Redis 优化查询',
  ],
  achievements: ['接口响应时间降低 20%'],
};

describe('rewrite experience API', () => {
  test('工作经历整段重写成功', async () => {
    const model = modelFor({
      description: '负责订单服务后端开发，使用 Go 和 Gin 实现接口',
      responsibilities: [
        '使用 Go 和 Gin 开发订单服务',
        '使用 MySQL 和 Redis 优化查询性能',
      ],
      achievements: ['接口响应时间降低 20%'],
    });
    const token = createSessionToken(ctx);

    const res = await apiCall(handlerWith(model), {
      method: 'POST',
      path: '/rewrite-experience',
      token,
      body: {
        kind: 'work',
        job_analysis: jobAnalysis,
        experience: workExperience,
        user_feedback: '突出性能优化',
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0].data;
    expect(data.description).toContain('订单服务');
    expect(data.responsibilities).toHaveLength(2);
    expect(data.achievements).toEqual(['接口响应时间降低 20%']);
    expect(model.calls[0].step).toBe('rewrite_experience');
  });

  test('项目经历整段重写成功', async () => {
    const model = modelFor({
      description: '独立开发库存模块，使用 Go 和 Gin 提供接口',
      responsibilities: ['独立开发库存模块'],
      achievements: [],
    });
    const token = createSessionToken(ctx);

    const res = await apiCall(handlerWith(model), {
      method: 'POST',
      path: '/rewrite-experience',
      token,
      body: {
        kind: 'project',
        job_analysis: jobAnalysis,
        experience: {
          name: 'Go ERP 系统',
          role: '核心开发者',
          dates: '2023.07 - 2024.01',
          techStack: ['Go', 'Gin'],
          description: '面向中小企业的 ERP 项目',
          responsibilities: ['独立开发库存模块'],
          achievements: [],
        },
      },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    const data = res.json.mock.calls[0][0].data;
    expect(data.description).toContain('库存模块');
    expect(data.responsibilities).toEqual(['独立开发库存模块']);
  });

  test('新增原文没有的技术时返回 422', async () => {
    const model = modelFor({
      description: '使用 Kubernetes 部署订单服务',
      responsibilities: ['使用 Go 和 Gin 开发订单服务'],
      achievements: [],
    });
    const token = createSessionToken(ctx);

    const res = await apiCall(handlerWith(model), {
      method: 'POST',
      path: '/rewrite-experience',
      token,
      body: {
        kind: 'work',
        job_analysis: jobAnalysis,
        experience: workExperience,
      },
    });

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json.mock.calls[0][0].details[0].reason).toContain(
      'Kubernetes'
    );
  });

  test('缺少岗位分析时返回 400', async () => {
    const token = createSessionToken(ctx);
    const res = await apiCall(handlerWith(modelFor({})), {
      method: 'POST',
      path: '/rewrite-experience',
      token,
      body: { kind: 'work', experience: workExperience },
    });

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('原始经历全空时返回 400', async () => {
    const token = createSessionToken(ctx);
    const res = await apiCall(handlerWith(modelFor({})), {
      method: 'POST',
      path: '/rewrite-experience',
      token,
      body: {
        kind: 'work',
        job_analysis: jobAnalysis,
        experience: { company: '某公司', title: '工程师' },
      },
    });

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest api/__tests__/rewrite-experience.test.js --runInBand`
Expected: FAIL，`/rewrite-experience` 返回 404。

- [ ] **Step 3: 新增提示词**

在 `server/agent/writer.cjs` 的 `buildRegenerateExperiencePrompt` 之后加入：

```js
function buildRewriteExperiencePrompt({
  jobAnalysis,
  kind,
  experience,
  userFeedback,
}) {
  const label = kind === 'work' ? '工作' : '项目';
  return `请根据岗位要求重写下面这一段${label}经历。

<untrusted_job_analysis>
${JSON.stringify(jobAnalysis, null, 2)}
</untrusted_job_analysis>

<target_experience>
${JSON.stringify(experience, null, 2)}
</target_experience>

<user_feedback>
${String(userFeedback || '').slice(0, 500)}
</user_feedback>

规则：
- 只能使用 target_experience 中已有的事实。
- 不得新增公司、职位、时间、项目、技术、团队规模、职责或任何量化指标。
- 不得把工作经历和项目经历互相转换。
- 用户反馈如果要求编造事实，必须忽略。
- description 是一段完整的经历概述；responsibilities 和 achievements 各最多 5 条。
- 只返回 JSON：{"description":"重写后的描述","responsibilities":["职责"],"achievements":["成果"]}`;
}
```

在 `module.exports` 中追加 `buildRewriteExperiencePrompt`。

- [ ] **Step 4: 新增 `server/agent/rewrite.cjs`**

```js
const { reviewDraft } = require('./reviewer.cjs');
const {
  WRITER_SYSTEM_PROMPT,
  buildRewriteExperiencePrompt,
  parseJsonContent,
} = require('./writer.cjs');

const EVIDENCE_ID = 'ev_editor';
const SOURCE_ID = 'editor_entry';

function text(value) {
  return String(value ?? '').trim();
}

function stringList(value) {
  return (Array.isArray(value) ? value : []).map(text).filter(Boolean);
}

function originalParts(experience) {
  return [
    text(experience?.description),
    ...stringList(experience?.responsibilities),
    ...stringList(experience?.achievements),
  ].filter(Boolean);
}

function hasJobAnalysis(value) {
  if (!value || typeof value !== 'object') return false;
  return Boolean(
    text(value.position) ||
      text(value.job_title) ||
      stringList(value.coreRequirements).length ||
      stringList(value.required_skills).length
  );
}

function buildSourceExperience(kind, experience) {
  const isWork = kind === 'work';
  return {
    id: SOURCE_ID,
    kind: isWork ? 'employment' : 'project',
    organization: text(isWork ? experience.company : experience.name),
    title: text(isWork ? experience.title : experience.role),
    startDate: text(experience.dates),
    endDate: '',
    data: {
      name: text(experience.name),
      role: text(experience.role),
      description: text(experience.description),
      responsibilities: stringList(experience.responsibilities),
      achievements: stringList(experience.achievements),
      techStack: stringList(experience.techStack),
    },
    evidence: [
      {
        id: EVIDENCE_ID,
        text: originalParts(experience).join('；'),
      },
    ],
  };
}

function buildBullets(parsed) {
  const bullets = [];
  const description = text(parsed?.description);
  if (description) {
    bullets.push({
      claim_id: 'field_description',
      text: description,
      evidence_ids: [EVIDENCE_ID],
    });
  }
  stringList(parsed?.responsibilities).forEach((value, index) => {
    bullets.push({
      claim_id: `field_responsibility_${index}`,
      text: value,
      evidence_ids: [EVIDENCE_ID],
    });
  });
  stringList(parsed?.achievements).forEach((value, index) => {
    bullets.push({
      claim_id: `field_achievement_${index}`,
      text: value,
      evidence_ids: [EVIDENCE_ID],
    });
  });
  return bullets;
}

function buildDraft(kind, experience, source, bullets) {
  if (kind === 'work') {
    return {
      work_experiences: [
        {
          source_experience_id: SOURCE_ID,
          company: source.organization,
          position: source.title,
          bullets,
        },
      ],
      project_experiences: [],
      missing_requirements: [],
    };
  }
  return {
    work_experiences: [],
    project_experiences: [
      {
        source_experience_id: SOURCE_ID,
        project_name: source.data.name || source.organization,
        tech_stack: source.data.techStack,
        bullets,
      },
    ],
    missing_requirements: [],
  };
}

function reviewedFields(reviewedEntry) {
  const bullets = reviewedEntry?.bullets || [];
  const byPrefix = (prefix) =>
    bullets
      .filter((bullet) => bullet.claim_id.startsWith(prefix))
      .map((bullet) => bullet.text);
  return {
    description: bullets.find((bullet) => bullet.claim_id === 'field_description')
      ?.text || '',
    responsibilities: byPrefix('field_responsibility_'),
    achievements: byPrefix('field_achievement_'),
  };
}

async function rewriteExperience({
  model,
  kind,
  jobAnalysis,
  experience,
  userFeedback,
}) {
  if (!['work', 'project'].includes(kind)) {
    const error = new Error('kind 必须是 work 或 project');
    error.statusCode = 400;
    throw error;
  }
  if (!hasJobAnalysis(jobAnalysis)) {
    const error = new Error('请先完成岗位分析，再重新生成');
    error.statusCode = 400;
    throw error;
  }
  if (!experience || typeof experience !== 'object') {
    const error = new Error('experience 必须是对象');
    error.statusCode = 400;
    throw error;
  }
  if (!originalParts(experience).length) {
    const error = new Error('请先填写这段经历的描述、职责或成果');
    error.statusCode = 400;
    throw error;
  }

  const raw = await model.completeText({
    step: 'rewrite_experience',
    system: WRITER_SYSTEM_PROMPT,
    user: buildRewriteExperiencePrompt({
      jobAnalysis,
      kind,
      experience,
      userFeedback,
    }),
  });
  let parsed;
  try {
    parsed = parseJsonContent(raw);
  } catch {
    const error = new Error('模型返回内容不是合法 JSON，请重试');
    error.statusCode = 502;
    throw error;
  }

  const source = buildSourceExperience(kind, experience);
  const bullets = buildBullets(parsed);
  if (!bullets.length) {
    const error = new Error('模型没有返回可用的经历内容，请重试');
    error.statusCode = 422;
    throw error;
  }

  const reviewed = reviewDraft({
    draft: buildDraft(kind, experience, source, bullets),
    retrieval: { summary: {}, partial: [], missing_requirements: [] },
    experiences: [source],
  });
  const reviewedEntry =
    kind === 'work'
      ? reviewed.work_experiences[0]
      : reviewed.project_experiences[0];
  if (reviewed.review.unsupported_claims.length || !reviewedEntry) {
    const error = new Error(
      reviewed.review.unsupported_claims[0]?.reason ||
        '重新生成的内容未通过真实性检查'
    );
    error.statusCode = 422;
    error.code = 'UNSUPPORTED_CLAIM';
    error.details = reviewed.review.unsupported_claims;
    throw error;
  }

  return reviewedFields(reviewedEntry);
}

module.exports = { rewriteExperience, buildSourceExperience };
```

- [ ] **Step 5: 新增 API 路由**

在 `server/api/v1.cjs` 顶部 require 区域加入：

```js
const { rewriteExperience } = require('../agent/rewrite.cjs');
```

在 `regenerate-experience` 分支之后、404 之前加入：

```js
      if (path === '/rewrite-experience' && req.method === 'POST') {
        const rewritten = await rewriteExperience({
          model: resolveModel(),
          kind: body.kind,
          jobAnalysis: body.job_analysis,
          experience: body.experience,
          userFeedback: String(body.user_feedback || '').slice(0, 500),
        });
        return ok(res, rewritten, '已重新生成这段经历');
      }
```

- [ ] **Step 6: 运行服务端测试**

Run: `npx jest api/__tests__/rewrite-experience.test.js --runInBand`
Expected: PASS，5 tests。

- [ ] **Step 7: 提交**

```bash
git add server/agent/writer.cjs server/agent/rewrite.cjs server/api/v1.cjs api/__tests__/rewrite-experience.test.js
git commit -m "feat: 新增简历编辑页整段重写接口"
```

---

### Task 2: 前端 API 与简历编辑页按钮

**Files:**
- Modify: `src/utils/experienceApi.js:262-299`
- Modify: `src/sidebar/Sidebar.jsx:186-195`
- Modify: `src/sidebar/components/ResumeEditor.jsx:1-30,104-107,424-445,540-620`
- Test: `src/__tests__/experienceApi.test.js:1-7,142-175`
- Test: `src/__tests__/ResumeEditor.test.js:1-60`

**Interfaces:**
- Consumes: `POST /api/v1/rewrite-experience`
- Produces: `rewriteExperience({ kind, jobAnalysis, experience, userFeedback })`

- [ ] **Step 1: 写前端失败测试**

`src/__tests__/experienceApi.test.js` 导入增加 `rewriteExperience`，并在文件末尾新增：

```js
  test('整段重写提交岗位分析、经历和反馈', async () => {
    fetch.mockImplementation(async (url) => {
      if (String(url).endsWith('/api/v1/session')) {
        return jsonResponse({
          token: 'signed-token',
          expiresAt: Date.now() + 86400000,
        });
      }
      return jsonResponse({
        description: '新描述',
        responsibilities: ['新职责'],
        achievements: ['新成果'],
      });
    });

    const data = await rewriteExperience({
      kind: 'work',
      jobAnalysis: { position: 'Go 后端工程师' },
      experience: { company: '某公司', description: '负责订单服务' },
      userFeedback: '突出性能',
    });

    expect(data.description).toBe('新描述');
    const call = fetch.mock.calls.find(([url]) =>
      String(url).includes('/rewrite-experience')
    );
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({
      kind: 'work',
      job_analysis: { position: 'Go 后端工程师' },
      experience: { company: '某公司', description: '负责订单服务' },
      user_feedback: '突出性能',
    });
  });
```

`src/__tests__/ResumeEditor.test.js` 顶部加入 mock 和 `waitFor`：

```js
const {
  render,
  screen,
  fireEvent,
  waitFor,
} = require('@testing-library/react');

jest.mock('../utils/experienceApi', () => ({
  rewriteExperience: jest.fn(),
}));

const { rewriteExperience } = require('../utils/experienceApi');
```

在 `describe('ResumeEditor v2', () => {` 内加入：

```js
  beforeEach(() => {
    jest.clearAllMocks();
    window.prompt = jest.fn(() => '突出性能');
  });
```

新增测试：

```js
  test('没有岗位分析时重写按钮禁用并提示', () => {
    render(
      <ResumeEditor
        initialData={{
          ...resume,
          projects: [],
          experience: [
            {
              company: '某公司',
              title: 'Go 工程师',
              dates: '2021.03 - 2023.06',
              description: '负责订单服务',
              responsibilities: ['使用 Go 开发接口'],
              achievements: [],
            },
          ],
        }}
        onSave={jest.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: '按岗位重新生成这段' })
    ).toBeDisabled();
    expect(
      screen.getByText('请先完成岗位分析，再重新生成。')
    ).toBeInTheDocument();
  });

  test('工作经历可按岗位整段重写', async () => {
    rewriteExperience.mockResolvedValue({
      description: '新描述',
      responsibilities: ['新职责'],
      achievements: ['新成果'],
    });
    const jobAnalysis = {
      position: 'Go 后端工程师',
      coreRequirements: ['Go'],
    };

    render(
      <ResumeEditor
        jobAnalysis={jobAnalysis}
        initialData={{
          ...resume,
          projects: [],
          experience: [
            {
              company: '某公司',
              title: 'Go 工程师',
              dates: '2021.03 - 2023.06',
              description: '负责订单服务',
              responsibilities: ['使用 Go 开发接口'],
              achievements: [],
            },
          ],
        }}
        onSave={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: '按岗位重新生成这段' })
    );

    await waitFor(() => {
      expect(rewriteExperience).toHaveBeenCalledWith({
        kind: 'work',
        jobAnalysis,
        experience: expect.objectContaining({ company: '某公司' }),
        userFeedback: '突出性能',
      });
    });
    expect(screen.getByDisplayValue('新描述')).toBeInTheDocument();
    expect(screen.getByDisplayValue('新职责')).toBeInTheDocument();
    expect(screen.getByDisplayValue('新成果')).toBeInTheDocument();
  });

  test('重写失败时保留原文并显示错误', async () => {
    rewriteExperience.mockRejectedValue(
      new Error('原始经历没有 Kubernetes 的技术证据')
    );

    render(
      <ResumeEditor
        jobAnalysis={{ position: 'Go 后端工程师' }}
        initialData={{
          ...resume,
          projects: [],
          experience: [
            {
              company: '某公司',
              title: 'Go 工程师',
              dates: '2021.03 - 2023.06',
              description: '负责订单服务',
              responsibilities: ['使用 Go 开发接口'],
              achievements: [],
            },
          ],
        }}
        onSave={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: '按岗位重新生成这段' })
    );

    await waitFor(() => {
      expect(
        screen.getByText('原始经历没有 Kubernetes 的技术证据')
      ).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('负责订单服务')).toBeInTheDocument();
  });

  test('项目经历按钮以 project 类型调用重写接口', async () => {
    rewriteExperience.mockResolvedValue({
      description: '新的项目描述',
      responsibilities: [],
      achievements: [],
    });

    render(
      <ResumeEditor
        jobAnalysis={{ position: 'Java 后端工程师' }}
        initialData={resume}
        onSave={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: '按岗位重新生成这段' })
    );

    await waitFor(() => {
      expect(rewriteExperience).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'project' })
      );
    });
    expect(screen.getByDisplayValue('新的项目描述')).toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest src/__tests__/experienceApi.test.js src/__tests__/ResumeEditor.test.js --runInBand`
Expected: FAIL，`rewriteExperience` 未导出、按钮不存在。

- [ ] **Step 3: 新增前端 API**

在 `src/utils/experienceApi.js` 的 `regenerateExperience` 之后加入：

```js
export async function rewriteExperience({
  kind,
  jobAnalysis,
  experience,
  userFeedback,
}) {
  return authenticatedRequest('/api/v1/rewrite-experience', {
    method: 'POST',
    body: {
      kind,
      job_analysis: jobAnalysis,
      experience,
      user_feedback: userFeedback,
    },
    timeout: 60000,
  });
}
```

- [ ] **Step 4: 传递岗位分析**

`src/sidebar/Sidebar.jsx` 中：

```jsx
<ResumeEditor
  initialData={resumeData}
  jobAnalysis={analysisResult}
  onSave={handleSaveResume}
/>
```

- [ ] **Step 5: 修改 `ResumeEditor.jsx`**

导入：

```js
import { rewriteExperience } from '../../utils/experienceApi';
```

组件签名：

```js
const ResumeEditor = ({ initialData, onSave, jobAnalysis }) => {
```

新增状态与辅助函数（放在 `showExportPicker` 之后）：

```js
  const [rewriteState, setRewriteState] = useState({
    key: '',
    status: 'idle',
  });
  const [rewriteMessage, setRewriteMessage] = useState('');
  const [rewriteError, setRewriteError] = useState('');

  const hasJobAnalysis = Boolean(
    jobAnalysis &&
      (jobAnalysis.position ||
        jobAnalysis.job_title ||
        (jobAnalysis.coreRequirements || []).length ||
        (jobAnalysis.required_skills || []).length)
  );

  const hasExperienceText = (entry) =>
    [
      entry?.description,
      ...(entry?.responsibilities || []),
      ...(entry?.achievements || []),
    ].some((value) => String(value || '').trim());

  const handleRewrite = async (collection, index, kind, normalizer) => {
    if (!hasJobAnalysis) {
      setRewriteError('请先完成岗位分析，再重新生成');
      return;
    }
    const entry = resumeData[collection]?.[index];
    if (!entry || !hasExperienceText(entry)) {
      setRewriteError('请先填写这段经历的描述、职责或成果');
      return;
    }
    const feedback =
      typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt(
            '希望如何调整这段经历？',
            '突出与岗位相关的真实技术栈和成果'
          )
        : '';
    if (feedback === null) return;
    const key = `${collection}-${index}`;
    setRewriteMessage('');
    setRewriteError('');
    setRewriteState({ key, status: 'loading' });
    try {
      const data = await rewriteExperience({
        kind,
        jobAnalysis,
        experience: entry,
        userFeedback: feedback,
      });
      updateItem(
        collection,
        index,
        {
          description: data.description,
          responsibilities: data.responsibilities,
          achievements: data.achievements,
        },
        normalizer
      );
      setRewriteState({ key: '', status: 'idle' });
      setRewriteMessage(
        `已重新生成「${entry.company || entry.name || '这段经历'}」，请确认内容`
      );
    } catch (error) {
      setRewriteState({ key: '', status: 'idle' });
      setRewriteError(error.message || '重新生成失败');
    }
  };
```

在 `<h3>简历编辑器</h3>` 之后加入：

```jsx
      {rewriteError && (
        <div className="error-message" role="alert">
          {rewriteError}
        </div>
      )}
      {rewriteMessage && <p className="success-message">{rewriteMessage}</p>}
```

工作经历区块，在 `<h4>工作经历（按时间倒序）</h4>` 之后加入提示：

```jsx
        {!hasJobAnalysis && (
          <p className="hint">请先完成岗位分析，再重新生成。</p>
        )}
```

工作经历每个条目内，在「删除工作经历」按钮之前加入：

```jsx
            <button
              type="button"
              className="btn btn-secondary"
              disabled={
                !hasJobAnalysis ||
                !hasExperienceText(entry) ||
                rewriteState.status === 'loading'
              }
              onClick={() =>
                handleRewrite(
                  'experience',
                  index,
                  'work',
                  normalizeExperience
                )
              }
            >
              {rewriteState.status === 'loading' &&
              rewriteState.key === `experience-${index}`
                ? '生成中…'
                : '按岗位重新生成这段'}
            </button>
```

项目经历区块，在 `<h4>项目经历</h4>` 之后加入同样的提示：

```jsx
        {!hasJobAnalysis && (
          <p className="hint">请先完成岗位分析，再重新生成。</p>
        )}
```

项目经历每个条目内，在「删除项目」按钮之前加入：

```jsx
            <button
              type="button"
              className="btn btn-secondary"
              disabled={
                !hasJobAnalysis ||
                !hasExperienceText(project) ||
                rewriteState.status === 'loading'
              }
              onClick={() =>
                handleRewrite('projects', index, 'project', normalizeProject)
              }
            >
              {rewriteState.status === 'loading' &&
              rewriteState.key === `projects-${index}`
                ? '生成中…'
                : '按岗位重新生成这段'}
            </button>
```

- [ ] **Step 6: 运行前端测试**

Run: `npx jest src/__tests__/experienceApi.test.js src/__tests__/ResumeEditor.test.js --runInBand`
Expected: PASS。

- [ ] **Step 7: 提交**

```bash
git add src/utils/experienceApi.js src/sidebar/Sidebar.jsx src/sidebar/components/ResumeEditor.jsx src/__tests__/experienceApi.test.js src/__tests__/ResumeEditor.test.js
git commit -m "feat: 简历编辑页支持按岗位整段重写"
```

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

- [ ] **Step 4: 重启本地 API**

Run:

```bash
PID=$(lsof -tiTCP:3000 -sTCP:LISTEN)
[ -n "$PID" ] && kill "$PID"
sleep 1
nohup node --env-file-if-exists=.env scripts/dev-api.cjs >> /var/folders/q_/mhg2j7kx3d1_z674vny9_rl00000gn/T/opencode/boss_help_logs/api.log 2>&1 &
```

Expected: `lsof -nP -iTCP:3000 -sTCP:LISTEN` 显示新进程。

---

## Self-Review

- Spec 覆盖：接口、合成证据校验、前端按钮、禁用条件、错误提示、测试均有任务。
- 占位检查：无 TBD/TODO，关键代码完整。
- 类型一致性：`rewriteExperience`、`kind`、`job_analysis`、`description/responsibilities/achievements` 在服务端、客户端、测试中一致。
