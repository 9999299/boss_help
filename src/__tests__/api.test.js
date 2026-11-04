import { analyzeJob } from '../utils/api';

describe('前端分析 API 客户端', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        position: '后端工程师',
        projects: [],
        companyCandidates: [],
        strengths: [],
      }),
    });
  });

  test('只请求后端分析接口，不把 API key 放进前端请求', async () => {
    await analyzeJob({
      jobDescription: '负责 Java 服务',
      skills: ['Java'],
      experience: '3年',
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/analyze$/),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
    expect(JSON.parse(options.body).jobData.skills).toEqual(['Java']);
  });

  test('后端错误时向调用方抛出可重试错误', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: 'AI service failed' }),
    });

    await expect(analyzeJob({ jobDescription: 'test' })).rejects.toThrow(
      'AI service failed'
    );
  });
});
