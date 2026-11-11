/* global Blob */
import { buildResumeDocxBlob } from '../utils/resumeDocx';

const sample = {
  schemaVersion: 2,
  personalInfo: {
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '13800000000',
    summary: '后端工程师',
  },
  skills: ['Java', 'Redis'],
  experienceSummary: {
    totalYears: '5年',
    industryYears: '3年',
    industry: '电商',
  },
  experience: [
    {
      company: '示例科技',
      title: '后端工程师',
      dates: '2020.01 - 2025.01',
      location: '上海',
      description: '负责订单服务',
      responsibilities: ['维护订单链路'],
      achievements: ['接口延迟降低 20%'],
      userConfirmed: true,
    },
  ],
  projects: [],
  companyCandidates: [],
  strengths: [],
  education: [
    { school: '某大学', major: '计算机', degree: '本科', dates: '2016 - 2020' },
  ],
};

test('生成有效的 docx Blob', async () => {
  const blob = await buildResumeDocxBlob(sample);

  expect(blob).toBeInstanceOf(Blob);
  expect(blob.type).toBe(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  expect(blob.size).toBeGreaterThan(0);
});

test('空简历也能生成 Blob（姓名使用默认值）', async () => {
  const blob = await buildResumeDocxBlob({});

  expect(blob.size).toBeGreaterThan(0);
});
