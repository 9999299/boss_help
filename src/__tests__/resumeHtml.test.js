import { buildResumeHtml } from '../utils/resumeHtml';

describe('buildResumeHtml', () => {
  const sample = {
    personalInfo: {
      name: '张三',
      email: 'a@b.com',
      phone: '13800000000',
      summary: '3年经验',
    },
    skills: ['React', 'Node'],
    experience: [
      {
        title: '前端',
        company: 'A公司',
        dates: '2020-2023',
        description: '负责前端',
      },
    ],
    education: [
      {
        school: '某大学',
        major: '计算机科学',
        degree: '本科',
        dates: '2016-2020',
      },
    ],
  };

  test('includes name and skills', () => {
    const html = buildResumeHtml(sample);
    expect(html).toContain('张三');
    expect(html).toContain('React');
    expect(html).toContain('个人简介');
  });

  test('includes school, major and degree', () => {
    const html = buildResumeHtml(sample);
    expect(html).toContain('某大学');
    expect(html).toContain('计算机科学 · 本科');
    expect(html).toContain('2016-2020');
  });

  test('escapes HTML in user fields', () => {
    const html = buildResumeHtml({
      personalInfo: {
        name: '<script>x</script>',
        email: '',
        phone: '',
        summary: '',
      },
      skills: [],
      experience: [],
      education: [],
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  test('omits empty experience section', () => {
    const html = buildResumeHtml({
      personalInfo: { name: '李四', email: '', phone: '', summary: '' },
      skills: [],
      experience: [],
      education: [],
    });
    expect(html).toContain('李四');
    expect(html).not.toContain('工作经历');
  });

  test('includes projects section', () => {
    const html = buildResumeHtml({
      personalInfo: { name: '王五', email: '', phone: '', summary: '' },
      skills: [],
      experience: [],
      projects: [
        {
          name: '智能简历助手',
          role: '独立开发',
          dates: '2024.01 - 2024.06',
          techStack: ['React', 'Chrome Extension'],
          description: '实现职位分析与简历导出',
        },
      ],
      education: [],
    });
    expect(html).toContain('项目经历');
    expect(html).toContain('智能简历助手');
    expect(html).toContain('React');
  });

  test('includes project achievements, candidate companies and strengths with status labels', () => {
    const html = buildResumeHtml({
      personalInfo: { name: '候选人', email: '', phone: '', summary: '' },
      skills: [],
      experience: [],
      education: [],
      projects: [
        {
          name: '订单平台',
          role: '核心开发',
          dates: '',
          techStack: ['Java'],
          description: '负责服务',
          achievements: ['延迟降低 20%'],
          userConfirmed: false,
        },
      ],
      companyCandidates: [
        {
          company: '示例科技',
          role: '后端工程师',
          matchReason: '技术栈匹配',
          suggestedResponsibilities: ['负责微服务'],
          userConfirmed: false,
        },
      ],
      strengths: [
        {
          title: '系统设计',
          description: '能拆解复杂系统',
          evidenceSuggestions: ['准备架构图'],
          userConfirmed: false,
        },
      ],
    });

    expect(html).toContain('项目成果');
    expect(html).toContain('延迟降低 20%');
    expect(html).toContain('公司经历');
    expect(html).toContain('示例科技');
    expect(html).toContain('个人优势');
    expect(html).toContain('系统设计');
    expect(html).not.toContain('待核实');
    expect(html).not.toContain('示例项目');
    expect(html).not.toContain('请按实际修改');
    expect(html).not.toContain('优势草稿');
  });

  test('includes work years summary in the header', () => {
    const html = buildResumeHtml({
      personalInfo: { name: '赵六', email: '', phone: '', summary: '' },
      skills: [],
      experience: [],
      experienceSummary: {
        totalYears: '5年',
        industryYears: '3年',
        industry: '互联网',
      },
      education: [],
    });

    expect(html).toContain('总工作年限：5年');
    expect(html).toContain('相关行业经验：3年（互联网）');
  });

  test('renders work history in reverse chronological order with responsibilities', () => {
    const html = buildResumeHtml({
      personalInfo: { name: '赵六', email: '', phone: '', summary: '' },
      skills: [],
      experience: [
        {
          company: '旧公司',
          title: '初级工程师',
          dates: '2018.07 - 2020.06',
          responsibilities: ['维护老系统'],
        },
        {
          company: '新公司',
          title: '高级工程师',
          dates: '2021.03 - 2023.06',
          responsibilities: ['负责核心服务'],
          achievements: ['QPS 提升 2 倍'],
        },
      ],
      education: [],
    });

    expect(html).toContain('工作经历');
    expect(html).toContain('主要职责');
    expect(html).toContain('负责核心服务');
    expect(html).toContain('工作成果');
    expect(html).toContain('QPS 提升 2 倍');
    expect(html.indexOf('新公司')).toBeLessThan(html.indexOf('旧公司'));
  });

  test('escapes work history fields', () => {
    const html = buildResumeHtml({
      personalInfo: { name: 'a', email: '', phone: '', summary: '' },
      skills: [],
      experience: [
        { company: '<b>x</b>', responsibilities: ['<script>y</script>'] },
      ],
      education: [],
    });

    expect(html).not.toContain('<b>x</b>');
    expect(html).not.toContain('<script>y</script>');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
