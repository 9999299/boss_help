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
