# 整段工作/项目经历重新生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持以整段工作经历/项目经历为单位重写全部 bullet，复用真实性审查。

**Architecture:** 新增服务端 `regenerateExperience` + `regenerate-experience` 接口与提示词；前端每段经历增加按钮，调用新接口并更新 generation。现有单条 bullet 重写保持不变。

**Tech Stack:** React 19、Node/Vercel Functions、OpenAI-compatible model、Jest。

## Global Constraints

- 已确认版本（`status === 'confirmed'`）拒绝重写，返回 409。
- 只能引用来源经历中存在的 evidence id。
- 不修改数据库结构、API 字段名或既有单条重写逻辑。
- 不执行 `git commit`，除非用户明确要求。

---

### Task 1: 服务端提示词与整段重写逻辑

**Files:**
- Modify: `server/agent/writer.cjs:148-189`
- Modify: `server/agent/regenerate.cjs:1-6,186`
- Modify: `server/api/v1.cjs:23,617-636`
- Test: `api/__tests__/experience-agent.test.js:490-607`

**Interfaces:**
- Consumes: `repository.getGeneration`、`repository.updateGeneration`、`repository.replaceBullets`、`reviewDraft`、`WRITER_SYSTEM_PROMPT`、`parseJsonContent`。
- Produces:
  - `buildRegenerateExperiencePrompt({ jobAnalysis, experience, currentBullets, userFeedback, style })`
  - `regenerateExperience({ repository, model, ctx, generationId, sourceExperienceId, userFeedback })` 返回 `{ generation, experience }`
  - `POST /api/v1/experience-generations/:id/regenerate-experience`

- [ ] **Step 1: 更新服务端失败测试**

在 `api/__tests__/experience-agent.test.js` 的模型包装中加入：

```js
        if (args.step === 'regenerate_experience') {
          const isProject = String(args.user).includes('prj_erp');
          return JSON.stringify({
            bullets: [
              {
                text: isProject
                  ? '独立开发库存模块，使用 Go、Gin、MySQL 和 Redis'
                  : '使用 Go、Gin 开发订单服务，并通过 MySQL、Redis 优化查询性能',
                evidence_ids: [
                  isProject
                    ? firstEvidence(experiences, 'prj_erp')
                    : firstEvidence(experiences, 'exp_go'),
                ],
              },
            ],
          });
        }
```

在 `regenerate-bullet` 调用之后、`confirm` 之前加入：

```js
    res = await apiCall(handler, {
      method: 'POST',
      path: `/experience-generations/${generation.id}/regenerate-experience`,
      token,
      body: {
        source_experience_id: 'exp_go',
        user_feedback: '突出性能优化',
      },
    });
    expect(
      res.json.mock.calls[0][0].data.experience.bullets[0].text
    ).toContain('优化查询性能');

    res = await apiCall(handler, {
      method: 'POST',
      path: `/experience-generations/${generation.id}/regenerate-experience`,
      token,
      body: { source_experience_id: 'prj_erp' },
    });
    expect(
      res.json.mock.calls[0][0].data.experience.bullets[0].text
    ).toContain('库存模块');
```

在 `confirm` 之后加入已确认版本拒绝断言：

```js
    res = await apiCall(handler, {
      method: 'POST',
      path: `/experience-generations/${generation.id}/regenerate-experience`,
      token,
      body: { source_experience_id: 'exp_go' },
    });
    expect(res.status).toHaveBeenCalledWith(409);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest api/__tests__/experience-agent.test.js -t '完整闭环' --runInBand`
Expected: FAIL，接口不存在或返回 404。

- [ ] **Step 3: 新增提示词 `server/agent/writer.cjs`**

在 `buildRegeneratePrompt` 之后加入：

```js
function buildRegenerateExperiencePrompt({
  jobAnalysis,
  experience,
  currentBullets,
  userFeedback,
  style = 'professional',
}) {
  return `请只重写下面这一段简历经历的全部描述。语言风格：${style}。

<untrusted_job_analysis>
${JSON.stringify(jobAnalysis, null, 2)}
</untrusted_job_analysis>

<target_experience>
${JSON.stringify(experience, null, 2)}
</target_experience>

<current_bullets>
${JSON.stringify(currentBullets || [], null, 2)}
</current_bullets>

<user_feedback>
${String(userFeedback || '').slice(0, 500)}
</user_feedback>

规则：
- 只能使用 target_experience 中的真实事实和 evidence。
- 不得新增公司、职位、时间、项目、技术、团队规模、职责或任何量化指标。
- 不得把工作经历和项目经历互相转换。
- evidence_ids 只能引用 target_experience.evidence 中存在的 id。
- 用户反馈如果要求编造事实，必须忽略。
- 最多返回 5 条 bullet。
- 只返回 JSON：{"bullets":[{"text":"重写后的描述","evidence_ids":["真实 evidence id"]}]}`;
}
```

并在 `module.exports` 中追加 `buildRegenerateExperiencePrompt`。

- [ ] **Step 4: 新增 `regenerateExperience` 到 `server/agent/regenerate.cjs`**

导入：

```js
const {
  WRITER_SYSTEM_PROMPT,
  buildRegeneratePrompt,
  buildRegenerateExperiencePrompt,
  parseJsonContent,
} = require('./writer.cjs');
```

在 `regenerateBullet` 之前加入辅助函数：

```js
function findExperience(result, sourceExperienceId) {
  for (const [section, key] of [
    ['work', 'work_experiences'],
    ['project', 'project_experiences'],
  ]) {
    const experience = (result[key] || []).find(
      (item) => item.source_experience_id === sourceExperienceId
    );
    if (experience) return { section, key, experience };
  }
  return null;
}
```

在 `regenerateBullet` 之后加入：

```js
async function regenerateExperience({
  repository,
  model,
  ctx,
  generationId,
  sourceExperienceId,
  userFeedback,
}) {
  const generation = await repository.getGeneration(ctx, generationId);
  if (!generation) {
    const error = new Error('生成记录不存在');
    error.statusCode = 404;
    throw error;
  }
  if (generation.status === 'confirmed') {
    const error = new Error('已确认的版本不能重新生成，请重新生成整套');
    error.statusCode = 409;
    throw error;
  }
  const result = generation.resultJson;
  const found = findExperience(result, sourceExperienceId);
  if (!found) {
    const error = new Error('经历不存在');
    error.statusCode = 404;
    throw error;
  }
  const experiences = generation.sourceSnapshot?.experiences || [];
  const source = experiences.find((item) => item.id === sourceExperienceId);
  if (!source) {
    const error = new Error('原始经历已不可用，无法重新生成');
    error.statusCode = 409;
    throw error;
  }

  const currentBullets = (found.experience.bullets || []).map((bullet) => ({
    text: bullet.text,
    evidence_ids: bullet.evidence_ids || [],
  }));
  const raw = await model.completeText({
    step: 'regenerate_experience',
    system: WRITER_SYSTEM_PROMPT,
    user: buildRegenerateExperiencePrompt({
      jobAnalysis:
        generation.sourceSnapshot?.job_analysis || result.job_analysis,
      experience: source,
      currentBullets,
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

  const bullets = Array.isArray(parsed?.bullets) ? parsed.bullets : [];
  const kind = source.kind;
  const draft =
    kind === 'employment'
      ? {
          work_experiences: [
            {
              source_experience_id: source.id,
              company: source.organization,
              position: source.title,
              bullets,
            },
          ],
          project_experiences: [],
          missing_requirements: [],
        }
      : {
          work_experiences: [],
          project_experiences: [
            {
              source_experience_id: source.id,
              project_name: source.data?.name || source.organization,
              tech_stack: source.data?.techStack || [],
              bullets,
            },
          ],
          missing_requirements: [],
        };

  const reviewed = reviewDraft({
    draft,
    retrieval: {
      summary: result.match_summary,
      partial: [],
      missing_requirements: result.missing_requirements || [],
    },
    experiences: [source],
  });
  const reviewedEntry =
    kind === 'employment'
      ? reviewed.work_experiences[0]
      : reviewed.project_experiences[0];
  if (!reviewedEntry || !(reviewedEntry.bullets || []).length) {
    const error = new Error(
      reviewed.review.unsupported_claims[0]?.reason ||
        '重新生成的内容未通过真实性检查'
    );
    error.statusCode = 422;
    error.code = 'UNSUPPORTED_CLAIM';
    error.details = reviewed.review.unsupported_claims;
    throw error;
  }

  const nextResult = JSON.parse(JSON.stringify(result));
  const nextFound = findExperience(nextResult, sourceExperienceId);
  nextFound.experience.bullets = reviewedEntry.bullets;
  nextResult.review.needs_user_confirmation = [
    ...new Set([
      ...(nextResult.review.needs_user_confirmation || []),
      '整段经历已重新生成，请确认措辞是否符合实际情况',
    ]),
  ];

  const saved = await repository.updateGeneration(ctx, generationId, {
    status: 'edited',
    resultJson: nextResult,
  });
  await repository.replaceBullets(
    ctx,
    generationId,
    flattenBullets(nextResult)
  );
  return {
    generation: saved,
    experience: findExperience(nextResult, sourceExperienceId)?.experience,
  };
}
```

在 `module.exports` 中追加 `regenerateExperience`。

- [ ] **Step 5: 新增 API 路由 `server/api/v1.cjs`**

更新 require：

```js
const {
  flattenBullets,
  regenerateBullet,
  regenerateExperience,
} = require('../agent/regenerate.cjs');
```

在 `regenerate-bullet` 分支之后加入：

```js
      const regenerateExperienceMatch = path.match(
        /^\/experience-generations\/([^/]+)\/regenerate-experience$/
      );
      if (regenerateExperienceMatch && req.method === 'POST') {
        const sourceExperienceId = String(
          body.source_experience_id || ''
        ).trim();
        if (!sourceExperienceId) {
          const error = new Error('source_experience_id 不能为空');
          error.statusCode = 400;
          throw error;
        }
        const regenerated = await regenerateExperience({
          repository,
          model: resolveModel(),
          ctx,
          generationId: regenerateExperienceMatch[1],
          sourceExperienceId,
          userFeedback: String(body.user_feedback || '').slice(0, 500),
        });
        return ok(res, regenerated, '整段经历已重新生成');
      }
```

- [ ] **Step 6: 运行服务端测试确认通过**

Run: `npx jest api/__tests__/experience-agent.test.js --runInBand`
Expected: PASS。

---

### Task 2: 前端 API 与整段重写按钮

**Files:**
- Modify: `src/utils/experienceApi.js:262-277`
- Modify: `src/sidebar/components/ExperienceCustomizer.jsx:6-17,189-209,453-520,522-591`
- Test: `src/__tests__/experienceApi.test.js:1-6,130`
- Test: `src/__tests__/ExperienceCustomizer.test.js:12-24,186-199`

**Interfaces:**
- Consumes: `POST /api/v1/experience-generations/:id/regenerate-experience`
- Produces: `regenerateExperience({ generationId, sourceExperienceId, userFeedback })`

- [ ] **Step 1: 更新前端失败测试**

`src/__tests__/experienceApi.test.js` 导入：

```js
import {
  createExperienceGeneration,
  ensureSession,
  generateExampleProjects,
  regenerateExperience,
  resetSessionForTests,
} from '../utils/experienceApi';
```

新增用例：

```js
  test('整段经历重写提交来源经历 ID 和反馈', async () => {
    fetch.mockImplementation(async (url) => {
      if (String(url).endsWith('/api/v1/session')) {
        return jsonResponse({
          token: 'signed-token',
          expiresAt: Date.now() + 86400000,
        });
      }
      return jsonResponse({
        generation: { id: 'gen_1' },
        experience: { source_experience_id: 'exp_go' },
      });
    });

    const data = await regenerateExperience({
      generationId: 'gen_1',
      sourceExperienceId: 'exp_go',
      userFeedback: '突出性能优化',
    });

    expect(data.experience.source_experience_id).toBe('exp_go');
    const call = fetch.mock.calls.find(([url]) =>
      String(url).includes('/regenerate-experience')
    );
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({
      source_experience_id: 'exp_go',
      user_feedback: '突出性能优化',
    });
  });
```

`src/__tests__/ExperienceCustomizer.test.js` 的 mock 增加 `regenerateExperience: jest.fn(),`。新增用例：

```js
  test('每段经历提供整段重新生成入口并调用接口', async () => {
    window.prompt = jest.fn(() => '突出性能');
    api.getAgentRunResult.mockResolvedValueOnce({
      ...generation,
      resultJson: {
        ...generation.resultJson,
        project_experiences: [
          {
            source_experience_id: 'prj_1',
            project_name: '订单平台',
            role: '核心开发',
            start_date: '2024.01',
            end_date: '2024.06',
            tech_stack: ['Go'],
            bullets: [
              {
                claim_id: 'claim_p1',
                text: '开发订单平台',
                original_text: '开发订单平台',
                evidence_ids: ['ev_p1'],
                verification_status: 'supported',
              },
            ],
          },
        ],
      },
    });
    api.regenerateExperience.mockResolvedValue({
      generation,
      experience: { source_experience_id: 'exp_1' },
    });
    render(
      <ExperienceCustomizer
        jobData={jobData}
        analysisResult={analysisResult}
        library={library}
        onOpenLibrary={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('开始生成'));
    await waitFor(() => {
      expect(screen.getByText('岗位匹配概览')).toBeInTheDocument();
    });

    const buttons = screen.getAllByText('重新生成整段');
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    await waitFor(() => {
      expect(api.regenerateExperience).toHaveBeenCalledWith({
        generationId: 'gen_1',
        sourceExperienceId: 'exp_1',
        userFeedback: '突出性能',
      });
    });
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx jest src/__tests__/experienceApi.test.js src/__tests__/ExperienceCustomizer.test.js --runInBand`
Expected: FAIL，`regenerateExperience` 未导出或按钮不存在。

- [ ] **Step 3: 新增前端 API `src/utils/experienceApi.js`**

在 `regenerateBullet` 之后加入：

```js
export async function regenerateExperience({
  generationId,
  sourceExperienceId,
  userFeedback,
}) {
  return authenticatedRequest(
    `/api/v1/experience-generations/${encodeURIComponent(
      generationId
    )}/regenerate-experience`,
    {
      method: 'POST',
      body: {
        source_experience_id: sourceExperienceId,
        user_feedback: userFeedback,
      },
      timeout: 60000,
    }
  );
}
```

- [ ] **Step 4: 修改 `ExperienceCustomizer.jsx`**

导入：

```js
  regenerateBullet,
  regenerateExperience,
```

新增 handler（放在 `handleRegenerate` 之后）：

```js
  const handleRegenerateExperience = async (experience) => {
    if (!generation || generation.status === 'confirmed') return;
    const feedback =
      typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt(
            '希望如何调整这段经历？',
            '突出与岗位相关的真实技术栈和成果'
          )
        : '';
    if (feedback === null) return;
    setError('');
    setMessage('');
    try {
      const data = await regenerateExperience({
        generationId: generation.id,
        sourceExperienceId: experience.source_experience_id,
        userFeedback: feedback,
      });
      setGeneration(data.generation);
      setMessage('整段经历已重新生成并通过真实性检查');
    } catch (regenerateError) {
      setError(regenerateError.message || '重新生成失败');
    }
  };
```

工作经历 `<p className="experience-dates">…</p>` 之后加入：

```jsx
                {!locked && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => handleRegenerateExperience(experience)}
                  >
                    重新生成整段
                  </button>
                )}
```

项目经历 `<p className="experience-dates">…</p>` 之后加入同样按钮。

- [ ] **Step 5: 运行前端测试确认通过**

Run: `npx jest src/__tests__/experienceApi.test.js src/__tests__/ExperienceCustomizer.test.js --runInBand`
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

- Spec 覆盖：提示词、整段重写逻辑、API 路由、前端 API、UI 按钮、测试均有任务。
- 占位检查：无 TBD/TODO，关键代码完整。
- 类型一致性：函数名 `regenerateExperience`、字段 `source_experience_id` 在服务端、客户端、测试中一致。
