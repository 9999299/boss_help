import {
  createExperienceGeneration,
  ensureSession,
  resetSessionForTests,
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
});
