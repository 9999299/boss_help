import {
  normalizeAnalysisResult,
  normalizeExperience,
  normalizeExperienceSummary,
  normalizeResume,
  sortByDateDesc,
  updateEvidenceItem,
} from '../utils/resumeSchema';

describe('resume schema v2', () => {
  test('规范化分析结果并为生成内容补充证据状态', () => {
    const result = normalizeAnalysisResult({
      position: '后端开发工程师',
      projects: [{ name: '订单系统', achievements: ['延迟降低 30%'] }],
      companyCandidates: [{ company: '示例科技', source: 'page' }],
      strengths: [{ title: '工程能力' }],
    });

    expect(result.projects[0]).toMatchObject({
      name: '订单系统',
      achievements: ['延迟降低 30%'],
      source: 'model',
      evidenceStatus: 'example',
      userConfirmed: false,
    });
    expect(result.companyCandidates[0]).toMatchObject({
      company: '示例科技',
      source: 'page',
      evidenceStatus: 'candidate',
      userConfirmed: false,
    });
    expect(result.strengths[0]).toMatchObject({
      title: '工程能力',
      source: 'model',
      evidenceStatus: 'draft',
      userConfirmed: false,
    });
  });

  test('将旧简历迁移为 v2 且不把候选公司混入真实工作经历', () => {
    const migrated = normalizeResume({
      personalInfo: { name: '张三' },
      experience: [{ company: '真实公司', title: '工程师' }],
      projects: [{ name: '旧项目', techStack: ['React'] }],
    });

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.experience[0]).toMatchObject({
      company: '真实公司',
      title: '工程师',
      source: 'user',
      evidenceStatus: 'draft',
      userConfirmed: false,
      responsibilities: [],
    });
    expect(migrated.companyCandidates).toEqual([]);
    expect(migrated.strengths).toEqual([]);
    expect(migrated.projects[0]).toMatchObject({
      name: '旧项目',
      achievements: [],
      source: 'user',
      evidenceStatus: 'example',
      userConfirmed: false,
    });
  });

  test('保留已核实的 v2 条目及其来源', () => {
    const normalized = normalizeResume({
      schemaVersion: 2,
      projects: [
        {
          name: '真实项目',
          source: 'user',
          evidenceStatus: 'example',
          userConfirmed: true,
          achievements: ['吞吐量提升 20%'],
        },
      ],
      companyCandidates: [],
      strengths: [],
    });

    expect(normalized.projects[0].userConfirmed).toBe(true);
    expect(normalized.projects[0].source).toBe('user');
  });

  test('编辑证据条目时自动重置核实状态', () => {
    const updated = updateEvidenceItem(
      {
        title: '擅长 React',
        source: 'model',
        evidenceStatus: 'draft',
        userConfirmed: true,
      },
      { description: '具备大型 React 项目经验' }
    );

    expect(updated.description).toBe('具备大型 React 项目经验');
    expect(updated.userConfirmed).toBe(false);
  });

  test('规范化工作经历并默认标记为待核实草稿', () => {
    const experience = normalizeExperience({
      company: '某互联网公司',
      title: '后端工程师',
      dates: '2021.03 - 2023.06',
      location: '上海',
      description: '负责订单服务',
      responsibilities: ['负责订单域服务开发', '优化接口性能'],
      achievements: ['接口延迟降低 30%'],
    });

    expect(experience).toMatchObject({
      company: '某互联网公司',
      title: '后端工程师',
      dates: '2021.03 - 2023.06',
      location: '上海',
      responsibilities: ['负责订单域服务开发', '优化接口性能'],
      achievements: ['接口延迟降低 30%'],
      source: 'model',
      evidenceStatus: 'draft',
      userConfirmed: false,
    });
  });

  test('工作年限汇总默认为空且未核实', () => {
    expect(normalizeExperienceSummary()).toMatchObject({
      totalYears: '',
      industryYears: '',
      industry: '',
      source: 'model',
      evidenceStatus: 'draft',
      userConfirmed: false,
    });
  });

  test('工作经历按在职时间倒序排列，最近的在最前', () => {
    const sorted = sortByDateDesc([
      { company: '旧公司', dates: '2018.07 - 2020.06' },
      { company: '新公司', dates: '2021.03 - 2023.06' },
      { company: '最早公司', dates: '2016.07 - 2018.06' },
    ]);

    expect(sorted.map((item) => item.company)).toEqual([
      '新公司',
      '旧公司',
      '最早公司',
    ]);
  });

  test('分析结果中的工作经历按时间倒序并补齐职责与成果字段', () => {
    const result = normalizeAnalysisResult({
      experience: [
        { company: '旧公司', dates: '2018.07 - 2020.06' },
        {
          company: '新公司',
          dates: '2021.03 - 2023.06',
          responsibilities: ['负责核心服务'],
        },
      ],
      experienceSummary: { totalYears: '5年', industryYears: '3年' },
    });

    expect(result.experience.map((item) => item.company)).toEqual([
      '新公司',
      '旧公司',
    ]);
    expect(result.experience[0].responsibilities).toEqual(['负责核心服务']);
    expect(result.experience[1].responsibilities).toEqual([]);
    expect(result.experienceSummary).toMatchObject({
      totalYears: '5年',
      industryYears: '3年',
      source: 'model',
      evidenceStatus: 'draft',
      userConfirmed: false,
    });
  });
});
