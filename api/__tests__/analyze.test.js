jest.mock('openai', () => {
  const mockOpenAI = jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  position: '前端开发工程师',
                  coreRequirements: ['React开发', 'JavaScript精通'],
                  skillMatch: { matched: ['React'], missing: ['Vue'], suggestions: ['学习Vue'] },
                  resumeTips: ['突出React项目'],
                  interviewPrep: ['准备React面试题']
                })
              }
            }]
          })
        }
      }
    };
  });
  return mockOpenAI;
});

const { analyzeJob } = require('../analyze');
const OpenAI = require('openai');

describe('analyzeJob', () => {
  let mockInstance;
  let originalCreate;

  beforeEach(() => {
    // Get the instance used by analyzeJob (first constructor call)
    mockInstance = OpenAI.mock.results[0].value;
    originalCreate = mockInstance.chat.completions.create;
  });

  afterEach(() => {
    mockInstance.chat.completions.create = originalCreate;
  });

  test('analyzeJob 分析职位描述并返回结构化数据', async () => {
    const jobData = {
      jobDescription: '前端开发工程师，负责React应用开发',
      skills: ['React', 'JavaScript'],
      experience: '3年经验'
    };
    
    const result = await analyzeJob(jobData);
    
    expect(result).toHaveProperty('position');
    expect(result).toHaveProperty('coreRequirements');
    expect(result).toHaveProperty('skillMatch');
    expect(result).toHaveProperty('resumeTips');
    expect(result).toHaveProperty('interviewPrep');
    expect(Array.isArray(result.coreRequirements)).toBe(true);
    expect(typeof result.skillMatch).toBe('object');
    expect(Array.isArray(result.resumeTips)).toBe(true);
    expect(Array.isArray(result.interviewPrep)).toBe(true);
  });

  test('analyzeJob 处理空输入', async () => {
    const jobData = {
      jobDescription: '',
      skills: [],
      experience: ''
    };
    
    const result = await analyzeJob(jobData);
    expect(result).toHaveProperty('position');
  });

  test('analyzeJob 处理AI失败', async () => {
    mockInstance.chat.completions.create.mockRejectedValue(new Error('API error'));
    
    const jobData = {
      jobDescription: 'test',
      skills: ['test'],
      experience: 'test'
    };
    
    const result = await analyzeJob(jobData);
    expect(result).toHaveProperty('position', '未知职位');
    expect(result.coreRequirements).toContain('分析失败');
    expect(result.skillMatch).toEqual({ matched: [], missing: [], suggestions: [] });
    expect(result.resumeTips).toContain('请稍后重试');
    expect(result.interviewPrep).toContain('请稍后重试');
  });

  test('analyzeJob 处理无效JSON响应', async () => {
    mockInstance.chat.completions.create.mockResolvedValue({
      choices: [{
        message: {
          content: 'Not valid JSON'
        }
      }]
    });
    
    const jobData = {
      jobDescription: 'test',
      skills: ['test'],
      experience: 'test'
    };
    
    const result = await analyzeJob(jobData);
    expect(result).toHaveProperty('position', '未知职位');
    expect(result.coreRequirements).toContain('分析失败');
  });
});