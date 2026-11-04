const { analyzeJob } = require('../api/analyze');

if (!process.env.AI_API_KEY) {
  console.error('AI_API_KEY is required and must be supplied only via the environment.');
  process.exit(1);
}

async function main() {
  const result = await analyzeJob(
    {
      jobDescription:
        '招聘后端工程师，负责 Java 微服务、Redis 缓存和 PostgreSQL 数据库，参与高并发系统设计。',
      skills: ['Java', 'Spring Boot', 'Redis', 'PostgreSQL'],
      experience: '3年以上经验',
      companyHints: ['示例科技'],
      pageTitle: '后端工程师',
      pageUrl: 'https://www.zhipin.com/',
    },
    { strict: true }
  );

  console.log(
    JSON.stringify({
      position: result.position,
      projectCount: result.projects.length,
      companyCandidateCount: result.companyCandidates.length,
      strengthCount: result.strengths.length,
      firstCompany: result.companyCandidates[0]?.company || '',
    })
  );
}

main().catch((error) => {
  console.error(`API probe failed: ${error.message}`);
  process.exitCode = 1;
});
