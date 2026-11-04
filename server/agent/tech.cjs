const TECH_TERMS = [
  'React',
  'Vue',
  'Angular',
  'Next.js',
  'Nuxt',
  'Node.js',
  'Node',
  'TypeScript',
  'JavaScript',
  'ES6',
  'Python',
  'Java',
  'Go',
  'Golang',
  'Rust',
  'C++',
  'C#',
  'PHP',
  'Swift',
  'Kotlin',
  'Spring',
  'Spring Boot',
  'Django',
  'Flask',
  'FastAPI',
  'Express',
  'NestJS',
  'Docker',
  'Kubernetes',
  'K8s',
  'AWS',
  'Azure',
  'GCP',
  '阿里云',
  'MySQL',
  'PostgreSQL',
  'Postgres',
  'MongoDB',
  'Redis',
  'Elasticsearch',
  'Oracle',
  'SQL',
  'Git',
  'Linux',
  'Nginx',
  'Webpack',
  'Vite',
  'gRPC',
  'REST',
  'GraphQL',
  'WebSocket',
  '微服务',
  '分布式',
  'CI/CD',
  'Jenkins',
  'GitLab',
  'GitHub Actions',
  '高并发',
  '高可用',
  '缓存',
  '消息队列',
  'RabbitMQ',
  'Kafka',
  'RocketMQ',
  'Flutter',
  'React Native',
  'Electron',
  '小程序',
  'TensorFlow',
  'PyTorch',
  '机器学习',
  '深度学习',
  'LLM',
  'RAG',
  'PostgreSQL',
  'pgvector',
  'HTML',
  'CSS',
  'Sass',
  'Tailwind',
  'Jest',
  'Vitest',
  'Cypress',
  'Playwright',
  'MySQL',
  'Redis',
];

const ALIASES = new Map([
  ['k8s', ['kubernetes']],
  ['kubernetes', ['k8s']],
  ['go', ['golang']],
  ['golang', ['go']],
  ['node', ['node.js', 'nodejs']],
  ['node.js', ['node', 'nodejs']],
  ['nodejs', ['node', 'node.js']],
  ['postgres', ['postgresql']],
  ['postgresql', ['postgres']],
  ['js', ['javascript']],
  ['javascript', ['js']],
  ['ts', ['typescript']],
  ['typescript', ['ts']],
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasesFor(value) {
  const key = normalize(value);
  return [key, ...(ALIASES.get(key) || [])];
}

function containsSkill(text, skill) {
  const haystack = normalize(text);
  return aliasesFor(skill).some((alias) => {
    const value = normalize(alias);
    if (!value) return false;
    if (!/^[a-z0-9+#.]+$/.test(value)) return haystack.includes(value);
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(
      `(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#.]|$)`,
      'i'
    ).test(haystack);
  });
}

function findTechMentions(text) {
  const haystack = normalize(text);
  const found = new Set();
  for (const term of TECH_TERMS) {
    const normalized = normalize(term);
    if (normalized.length < 2) continue;
    const pattern = new RegExp(
      `(^|[^a-z0-9+#.])${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9+#.]|$)`,
      'i'
    );
    if (pattern.test(haystack)) found.add(term);
  }
  return [...found];
}

function skillsInText(text) {
  return findTechMentions(text);
}

module.exports = {
  TECH_TERMS,
  aliasesFor,
  containsSkill,
  findTechMentions,
  normalize,
  skillsInText,
};
