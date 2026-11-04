/* global __ANALYZE_API_URL__ */
import { normalizeAnalysisResult, normalizeResume } from './resumeSchema.js';

// 这是公开的后端地址，不是模型密钥。webpack 只允许注入 ANALYZE_API_URL。
const ANALYZE_API_URL =
  typeof __ANALYZE_API_URL__ !== 'undefined'
    ? __ANALYZE_API_URL__
    : 'http://localhost:3000';

/**
 * 分析职位要求
 * @param {Object} jobData - 职位数据
 * @returns {Object} 分析结果
 */
const PROJECT_NAMES = [
  ['企业级', '管理系统', '数据平台'],
  ['个人', '工具站', 'CLI 工具'],
  ['实时', '协作平台', '社交应用'],
  ['电商', '商城', '交易平台'],
  ['云', '微服务', 'API 网关'],
  ['开源', '组件库', 'SDK'],
];

const PROJECT_ROLES = ['独立开发', '核心开发者', '全栈开发', '架构师'];

const PROJECT_THEMES = [
  '通过 RESTful API 实现数据增删改查与权限控制',
  '基于 WebSocket 实现实时推送与状态同步',
  '利用 Docker + CI/CD 完成自动化部署与监控',
  '针对高并发场景进行缓存策略与数据库优化',
  '构建可扩展的插件化架构，支持动态加载模块',
  '集成第三方平台能力，打通多端数据流',
];

/**
 * 从 JD 文本中补充提取技能关键词（与 content 提取互补）
 */
export function extractSkillsFromText(text) {
  if (!text) return [];
  const keywords = [
    'React',
    'Vue',
    'Vue3',
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
    'MongoDB',
    'Redis',
    'Elasticsearch',
    'Oracle',
    'Git',
    'Linux',
    'Nginx',
    'Webpack',
    'Vite',
    'Babel',
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
    'HTML',
    'CSS',
    'Sass',
    'Less',
    'Tailwind',
    'Jest',
    'Vitest',
    'Cypress',
    'Playwright',
  ];
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase()));
}

/**
 * 生成项目名：用项目名模板 + 岗位核心技能，让每条项目名不同
 */
function makeProjectName(skillGroups, idx) {
  const group = PROJECT_NAMES[idx % PROJECT_NAMES.length];
  const lead = skillGroups[idx % skillGroups.length]?.[0] || '';
  if (idx === 0 && lead) return `${lead}${group[0]}`;
  if (idx === 1) return `${group[1]}平台`;
  return `${group[2] || group[0]}服务`;
}

function dedupeProjects(list) {
  const seen = new Set();
  return list.filter((p) => {
    const key = (p.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeProject(p = {}) {
  return {
    name: p.name || '',
    role: p.role || '独立开发',
    dates: p.dates || '',
    techStack: Array.isArray(p.techStack)
      ? p.techStack.filter(Boolean)
      : typeof p.techStack === 'string'
        ? p.techStack
            .split(/[,，、]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    description: p.description || '',
  };
}

function mergeTech(existing, extra) {
  const out = [];
  const seen = new Set();
  [...(existing || []), ...(extra || [])].forEach((t) => {
    const key = String(t).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  });
  return out;
}

/** 岗位技能排在 techStack 前面 */
function prioritizeSkills(techStack, requiredSkills) {
  const requiredLower = new Set(requiredSkills.map((s) => s.toLowerCase()));
  const primary = [];
  const secondary = [];
  techStack.forEach((t) => {
    if (requiredLower.has(String(t).toLowerCase())) primary.push(t);
    else secondary.push(t);
  });
  return [...primary, ...secondary].slice(0, 8);
}

/**
 * 强制对齐：让每条项目的技能栈和描述都不重复
 */
export function alignProjectsWithSkills(projects, requiredSkills) {
  const skills = [...new Set((requiredSkills || []).filter(Boolean))];
  if (!skills.length) {
    return (projects || []).map(normalizeProject);
  }

  const raw = (projects || []).map(normalizeProject);
  const unique = dedupeProjects(raw);
  const count = Math.max(2, Math.min(3, unique.length || 2));

  // 轮流发牌：保证所有技能被覆盖，每条项目获得不同技能子集
  const projectSkills = Array.from({ length: count }, () => []);
  skills.forEach((skill, i) => {
    projectSkills[i % count].push(skill);
  });

  const result = [];
  for (let i = 0; i < count; i++) {
    const existing = unique[i] || {};
    const assigned = projectSkills[i];

    const name =
      existing.name ||
      makeProjectName(
        assigned.map((s) => [s]),
        i
      );
    const role = existing.role || PROJECT_ROLES[i % PROJECT_ROLES.length];
    const dates = existing.dates || '2024.01 - 2024.06';

    const merged = mergeTech(existing.techStack, assigned);
    const techStack = prioritizeSkills(merged, skills);

    let description = existing.description || '';
    if (!description || description.length < 10) {
      const theme = PROJECT_THEMES[i % PROJECT_THEMES.length];
      const stackNames = techStack.slice(0, 5).join('、');
      const label = PROJECT_NAMES[i % PROJECT_NAMES.length];
      description = `使用 ${stackNames} 实现${label[0]}${label[1] || '项目'}。${theme}，展示了在该技术栈下的实战能力。`;
    }

    result.push({ name, role, dates, techStack, description });
  }

  return result;
}

export async function analyzeJob(jobData) {
  const skills = [
    ...new Set([
      ...(jobData?.skills || []),
      ...extractSkillsFromText(jobData?.jobDescription || ''),
    ]),
  ];
  const baseUrl = String(ANALYZE_API_URL).replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobData: { ...jobData, skills },
    }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || `API error ${response.status}`);
  }

  const result = normalizeAnalysisResult(payload);
  result.extractedSkills = skills;
  result.projects = normalizeAnalysisResult({
    ...result,
    projects: alignProjectsWithSkills(result.projects, skills),
  }).projects;
  if (!result.skillMatch?.matched?.length && skills.length) {
    result.skillMatch = {
      ...(result.skillMatch || {}),
      matched: skills.slice(0, 8),
    };
  }
  return result;
}

/**
 * 保存简历到本地存储
 * @param {Object} resume - 简历数据
 */
export async function saveResume(resume) {
  const normalizedResume = normalizeResume(resume);
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set({ resume: normalizedResume }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 从本地存储加载简历
 * @returns {Object} 简历数据
 */
export async function loadResume() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(['resume'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result.resume ? normalizeResume(result.resume) : null);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
