jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    position: '前端开发工程师',
                    coreRequirements: ['React开发', 'JavaScript精通'],
                    skillMatch: {
                      matched: ['React'],
                      missing: ['Vue'],
                      suggestions: ['学习Vue'],
                    },
                    resumeTips: ['突出React项目'],
                    interviewPrep: ['准备React面试题'],
                  }),
                },
              },
            ],
          }),
        },
      },
      responses: {
        create: jest.fn().mockResolvedValue({
          output_text: JSON.stringify({
            position: '后端开发工程师',
            projects: [],
            companyCandidates: [{ company: '示例科技', source: 'model' }],
            strengths: [{ title: '系统设计能力' }],
          }),
        }),
      },
    };
  });
  return mockOpenAI;
});

const handler = require('../analyze');
const { analyzeJob, buildPrompt } = require('../analyze');
const OpenAI = require('openai');

describe('analyzeJob', () => {
  let mockInstance;

  beforeEach(() => {
    // Get the instance used by analyzeJob (first constructor call)
    mockInstance = OpenAI.mock.results[0].value;
    mockInstance.chat.completions.create.mockReset().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              position: '前端开发工程师',
              coreRequirements: ['React开发', 'JavaScript精通'],
              skillMatch: {
                matched: ['React'],
                missing: ['Vue'],
                suggestions: ['学习Vue'],
              },
              resumeTips: ['突出React项目'],
              interviewPrep: ['准备React面试题'],
            }),
          },
        },
      ],
    });
    mockInstance.responses.create.mockClear();
  });

  afterEach(() => {
    delete process.env.AI_API_MODE;
    delete process.env.AI_REASONING;
  });

  test('分析提示词只要求简历相关字段', () => {
    const prompt = buildPrompt({
      jobDescription: '负责 Go 后端开发，要求 RAG 经验。',
      skills: ['Go', 'RAG'],
      experience: '3年',
    });
    expect(prompt).not.toMatch(
      /companyCandidates|strengths|interviewPrep|resumeTips|careerAdvice|jobHighlights/
    );
    expect(prompt).toContain('projects');
    expect(prompt).toContain('experienceSummary');
    expect(prompt).toContain('experience');
    expect(prompt).not.toContain('个人项目示例');
    expect(prompt).not.toContain('工作经历草稿');
    expect(prompt).toContain(
      '不要出现「示例」「草稿」「待核实」「请按实际修改」'
    );
  });

  test('分析客户端超时足够覆盖慢速推理模型', () => {
    const config = OpenAI.mock.calls[0][0];
    expect(config.timeout).toBeGreaterThanOrEqual(120000);
  });

  test('模型请求被中止时返回 504 超时', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockInstance.chat.completions.create.mockRejectedValue(
      Object.assign(new Error('Request was aborted.'), { name: 'Error' })
    );
    const res = {
      statusCode: 0,
      body: null,
      headers: {},
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
      end() {},
    };
    const req = {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: {
        jobData: { jobDescription: '前端开发工程师，负责React应用开发' },
      },
    };
    await handler(req, res);
    spy.mockRestore();
    expect(res.statusCode).toBe(504);
    expect(res.body).toEqual({ error: 'AI service timed out' });
  });

  test('AI_REASONING=off 时关闭推理以缩短耗时', async () => {
    process.env.AI_REASONING = 'off';
    await analyzeJob({ jobDescription: '前端开发工程师，负责React应用开发' });
    const request = mockInstance.chat.completions.create.mock.calls[0][0];
    expect(request.reasoning).toEqual({ enabled: false });
  });

  test('analyzeJob 分析职位描述并返回结构化数据', async () => {
    const jobData = {
      jobDescription: '前端开发工程师，负责React应用开发',
      skills: ['React', 'JavaScript'],
      experience: '3年经验',
    };

    const result = await analyzeJob(jobData);

    expect(result).toHaveProperty('position');
    expect(result).toHaveProperty('coreRequirements');
    expect(result).toHaveProperty('skillMatch');
    expect(result).toHaveProperty('resumeTips');
    expect(result).toHaveProperty('interviewPrep');
    expect(result).toHaveProperty('companyCandidates');
    expect(result).toHaveProperty('strengths');
    expect(result).toHaveProperty('projects');
    expect(Array.isArray(result.coreRequirements)).toBe(true);
    expect(typeof result.skillMatch).toBe('object');
    expect(Array.isArray(result.resumeTips)).toBe(true);
    expect(Array.isArray(result.interviewPrep)).toBe(true);
    expect(Array.isArray(result.companyCandidates)).toBe(true);
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(result).toHaveProperty('experience');
    expect(result).toHaveProperty('experienceSummary');
    expect(Array.isArray(result.experience)).toBe(true);
  });

  test('按时间倒序规范化模型返回的工作经历与工作年限', async () => {
    mockInstance.chat.completions.create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              experience: [
                {
                  company: '旧公司',
                  dates: '2018.07 - 2020.06',
                  responsibilities: ['维护老系统'],
                },
                {
                  company: '新公司',
                  dates: '2021.03 - 2023.06',
                  responsibilities: ['负责核心服务'],
                },
              ],
              experienceSummary: { totalYears: '5年', industryYears: '3年' },
            }),
          },
        },
      ],
    });

    const result = await analyzeJob(
      { jobDescription: '后端工程师' },
      { strict: true }
    );

    expect(result.experience.map((item) => item.company)).toEqual([
      '新公司',
      '旧公司',
    ]);
    expect(result.experience[0]).toMatchObject({
      responsibilities: ['负责核心服务'],
      source: 'model',
      evidenceStatus: 'draft',
      userConfirmed: false,
    });
    expect(result.experienceSummary).toMatchObject({
      totalYears: '5年',
      industryYears: '3年',
      source: 'model',
      evidenceStatus: 'draft',
      userConfirmed: false,
    });
  });

  test('analyzeJob 处理空输入', async () => {
    const jobData = {
      jobDescription: '',
      skills: [],
      experience: '',
    };

    const result = await analyzeJob(jobData);
    expect(result).toHaveProperty('position');
  });

  test('analyzeJob 处理AI失败', async () => {
    mockInstance.chat.completions.create.mockRejectedValue(
      new Error('API error')
    );

    const jobData = {
      jobDescription: 'test',
      skills: ['test'],
      experience: 'test',
    };

    const result = await analyzeJob(jobData);
    expect(result).toHaveProperty('position', '未知职位');
    expect(result.coreRequirements).toContain('分析失败');
    expect(result.skillMatch).toEqual({
      matched: [],
      missing: [],
      suggestions: [],
    });
    expect(result.resumeTips).toContain('请稍后重试');
    expect(result.interviewPrep).toContain('请稍后重试');
  });

  test('analyzeJob 处理无效JSON响应', async () => {
    mockInstance.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Not valid JSON',
          },
        },
      ],
    });

    const jobData = {
      jobDescription: 'test',
      skills: ['test'],
      experience: 'test',
    };

    const result = await analyzeJob(jobData);
    expect(result).toHaveProperty('position', '未知职位');
    expect(result.coreRequirements).toContain('分析失败');
  });

  test('支持 Responses API 协议', async () => {
    process.env.AI_API_MODE = 'responses';
    const result = await analyzeJob(
      { jobDescription: '负责后端平台建设', skills: ['Java'] },
      { strict: true }
    );

    expect(mockInstance.responses.create).toHaveBeenCalled();
    expect(result.companyCandidates[0]).toMatchObject({
      company: '示例科技',
      evidenceStatus: 'candidate',
      userConfirmed: false,
    });
    expect(result.strengths[0].title).toBe('系统设计能力');
  });

  test('只有页面实际提供的公司提示才能保留 page 来源', async () => {
    mockInstance.chat.completions.create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              companyCandidates: [
                { company: '页面公司', source: 'page' },
                { company: '模型公司', source: 'page' },
              ],
            }),
          },
        },
      ],
    });

    const result = await analyzeJob(
      {
        jobDescription: 'test',
        companyHints: ['页面公司'],
      },
      { strict: true }
    );

    expect(result.companyCandidates[0].source).toBe('page');
    expect(result.companyCandidates[1].source).toBe('model');
  });
});

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
}

describe('analyze API handler', () => {
  const handler = require('../analyze');
  const apiOpenAI = OpenAI.mock.results[0].value;

  test('拒绝超过大小限制的职位描述', async () => {
    const response = createResponse();
    const request = {
      method: 'POST',
      body: { jobData: { jobDescription: 'x'.repeat(12001) } },
    };

    await handler(request, response);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  test('拒绝过多的技能和公司提示', async () => {
    const response = createResponse();
    await handler(
      {
        method: 'POST',
        body: {
          jobData: {
            jobDescription: 'test',
            skills: Array.from({ length: 101 }, (_, i) => `skill-${i}`),
          },
        },
      },
      response
    );

    expect(response.status).toHaveBeenCalledWith(413);
  });

  test('模型失败时返回 502，而不是伪装成成功响应', async () => {
    const response = createResponse();
    apiOpenAI.chat.completions.create.mockRejectedValueOnce(
      new Error('upstream unavailable')
    );
    const request = {
      method: 'POST',
      body: { jobData: { jobDescription: '前端工程师' } },
    };

    await handler(request, response);

    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  test('处理预检、错误方法和缺少输入', async () => {
    const optionsResponse = createResponse();
    await handler({ method: 'OPTIONS', headers: {} }, optionsResponse);
    expect(optionsResponse.status).toHaveBeenCalledWith(204);

    const methodResponse = createResponse();
    await handler({ method: 'GET', headers: {} }, methodResponse);
    expect(methodResponse.status).toHaveBeenCalledWith(405);

    const inputResponse = createResponse();
    await handler({ method: 'POST', body: {}, headers: {} }, inputResponse);
    expect(inputResponse.status).toHaveBeenCalledWith(400);
  });

  test('上游限流时返回 429', async () => {
    const response = createResponse();
    const error = new Error('rate limit');
    error.status = 429;
    apiOpenAI.chat.completions.create.mockRejectedValueOnce(error);

    await handler(
      {
        method: 'POST',
        body: { jobData: { jobDescription: '测试' } },
        headers: {},
      },
      response
    );

    expect(response.status).toHaveBeenCalledWith(429);
  });
});
