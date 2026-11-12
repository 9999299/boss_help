import {
  createExperienceGeneration,
  ensureSession,
  generateExampleProjects,
  regenerateExperience,
  resetSessionForTests,
  rewriteExperience,
} from '../utils/experienceApi';

function jsonResponse(data) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ code: 0, message: 'ok', data }),
  };
}

describe('经历生成 API 客户端', () => {
  beforeEach(() => {
    resetSessionForTests();
    global.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          get: jest.fn((keys, callback) => callback({})),
          set: jest.fn((value, callback) => callback && callback()),
        },
      },
    };
    global.fetch = jest.fn();
  });

  test('首次请求创建签名会话，随后复用 token', async () => {
    fetch.mockImplementation(async () =>
      jsonResponse({
        token: 'signed-token',
        userId: 'user_1',
        tenantId: 'tenant_1',
        expiresAt: Date.now() + 86400000,
      })
    );

    const first = await ensureSession();
    const second = await ensureSession();

    expect(first.token).toBe('signed-token');
    expect(second.token).toBe('signed-token');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/session$/);
  });

  test('生成前同步已核实经历，并只提交岗位快照而非本地状态', async () => {
    fetch.mockImplementation(async (url, options) => {
      if (String(url).endsWith('/api/v1/session')) {
        return jsonResponse({
          token: 'signed-token',
          expiresAt: Date.now() + 86400000,
        });
      }
      if (String(url).endsWith('/api/v1/career-library')) {
        expect(options.method).toBe('PUT');
        return jsonResponse({ experiences: [], updatedAt: 'now' });
      }
      if (String(url).includes('/generate-experience')) {
        return jsonResponse({ run_id: 'run_1', status: 'pending' });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const data = await createExperienceGeneration({
      jobData: {
        jobDescription: '岗位职责：负责 Go 后端开发。任职要求：Go、Gin。',
        skills: ['Go'],
        pageUrl: 'https://www.zhipin.com/job_detail/1.html',
      },
      analysisResult: {
        position: 'Go 后端工程师',
        keyResponsibilities: ['后端接口开发'],
        coreRequirements: ['Go', 'Gin'],
      },
      library: {
        experiences: [
          {
            id: 'exp_1',
            kind: 'employment',
            organization: '某公司',
            title: '后端工程师',
            userConfirmed: true,
            data: { responsibilities: ['使用 Go 开发服务'] },
          },
        ],
      },
    });

    expect(data.run_id).toBe('run_1');
    const generateCall = fetch.mock.calls.find(([url]) =>
      String(url).includes('/generate-experience')
    );
    expect(generateCall[1].headers.Authorization).toBe('Bearer signed-token');
    const body = JSON.parse(generateCall[1].body);
    expect(body.job_snapshot).toMatchObject({
      title: 'Go 后端工程师',
      description: expect.stringContaining('Go 后端开发'),
      skills: ['Go'],
    });
    expect(body.include_work_experiences).toBe(true);
  });

  test('生成示例项目请求包含岗位快照和分析结果', async () => {
    fetch.mockImplementation(async (url) => {
      if (String(url).includes('/session')) {
        return jsonResponse({
          token: 'signed-token',
          userId: 'user_1',
          tenantId: 'tenant_1',
          expiresAt: Date.now() + 86400000,
        });
      }
      return jsonResponse({ projects: [], missing_requirements: [] });
    });

    await generateExampleProjects({
      jobData: {
        jobDescription: '岗位职责：负责 AI 后端开发。任职要求：Go、RAG。',
        skills: ['Go', 'RAG'],
        pageTitle: 'AI 后端工程师',
      },
      analysisResult: {
        position: 'AI 后端工程师',
        coreRequirements: ['Go', 'RAG'],
      },
      maxProjects: 2,
    });

    const call = fetch.mock.calls.find(([url]) =>
      String(url).includes('/example-projects')
    );
    expect(call[1].headers.Authorization).toBe('Bearer signed-token');
    const body = JSON.parse(call[1].body);
    expect(body.max_projects).toBe(2);
    expect(body.job_snapshot.title).toBe('AI 后端工程师');
    expect(body.job_analysis).toMatchObject({ position: 'AI 后端工程师' });
  });

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
});
