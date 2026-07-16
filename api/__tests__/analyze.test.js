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

describe('analyzeJob', () => {
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
});