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
    education: [{ school: '某大学', degree: '本科', dates: '2016-2020' }],
  };

  test('includes name and skills', () => {
    const html = buildResumeHtml(sample);
    expect(html).toContain('张三');
    expect(html).toContain('React');
    expect(html).toContain('个人简介');
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
});
