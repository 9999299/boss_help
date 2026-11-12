/**
 * @jest-environment node
 */

const {
  buildExampleProjectsPrompt,
  normalizeExampleProjects,
} = require('../../server/agent/example-projects.cjs');

describe('example projects agent', () => {
  test('prompt 只针对缺口并声明不得伪造', () => {
    const prompt = buildExampleProjectsPrompt({
      jobAnalysis: { job_title: 'AI 后端工程师', required_skills: ['Go', 'RAG'] },
      missingRequirements: [{ requirement: 'RAG' }, { requirement: 'Kubernetes' }],
      experiences: [
        {
          kind: 'employment',
          organization: '某公司',
          title: 'Go 工程师',
          data: { techStack: ['Go'], responsibilities: ['使用 Go 开发服务'] },
        },
      ],
      jobSnapshot: { description: '招聘 AI 后端工程师，要求 Go、RAG、Kubernetes。' },
      maxProjects: 2,
    });
    expect(prompt).toContain('RAG');
    expect(prompt).toContain('Kubernetes');
    expect(prompt).toContain('<untrusted_job_jd>');
    expect(prompt).toMatch(/不得声称|项目建议/);
    expect(prompt).not.toContain('示例项目名称');
    expect(prompt).toContain(
      '不要出现「示例」「草稿」「待核实」「请按实际修改」'
    );
  });

  test('规范化强制示例状态并过滤非缺口覆盖项', () => {
    const projects = normalizeExampleProjects(
      {
        projects: [
          {
            name: 'RAG 知识库服务',
            role: '核心开发',
            dates: '2024.01 - 2024.06',
            techStack: ['RAG', 'Go'],
            description: '搭建检索增强问答服务',
            responsibilities: ['实现检索与重排'],
            achievements: [],
            coveredRequirements: ['RAG', 'Python'],
          },
          {
            name: 'K8s 自动化运维',
            coveredRequirements: ['Kubernetes'],
          },
          { name: '' },
        ],
      },
      {
        missingRequirements: [
          { requirement: 'RAG' },
          { requirement: 'Kubernetes' },
        ],
        maxProjects: 5,
      }
    );

    expect(projects).toHaveLength(2);
    expect(projects[0].coveredRequirements).toEqual(['RAG']);
    expect(projects[1].coveredRequirements).toEqual(['Kubernetes']);
    for (const project of projects) {
      expect(project.source).toBe('model');
      expect(project.evidenceStatus).toBe('example');
      expect(project.userConfirmed).toBe(false);
      expect(project.id).toMatch(/^exm_/);
    }
  });

  test('按 maxProjects 裁剪数量', () => {
    const projects = normalizeExampleProjects(
      { projects: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] },
      { missingRequirements: [{ requirement: 'X' }], maxProjects: 2 }
    );
    expect(projects).toHaveLength(2);
  });
});
