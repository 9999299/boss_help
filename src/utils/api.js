// AI API 配置（直接从前端调用）
// 配置文件优先使用，未配置则使用默认值
let AI_API_BASE = 'https://token-plan-cn.xiaomimimo.com/v1';
let AI_API_KEY = '';

try {
  const config = await import('../config.js');
  AI_API_BASE = config.AI_API_BASE || AI_API_BASE;
  AI_API_KEY = config.AI_API_KEY || '';
} catch {
  // config.js 不存在时使用默认值
}

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
    'React', 'Vue', 'Vue3', 'Angular', 'Next.js', 'Nuxt',
    'Node.js', 'Node', 'TypeScript', 'JavaScript', 'ES6',
    'Python', 'Java', 'Go', 'Golang', 'Rust', 'C++', 'C#', 'PHP', 'Swift', 'Kotlin',
    'Spring', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'Express', 'NestJS',
    'Docker', 'Kubernetes', 'K8s', 'AWS', 'Azure', 'GCP', '阿里云',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle',
    'Git', 'Linux', 'Nginx', 'Webpack', 'Vite', 'Babel',
    'gRPC', 'REST', 'GraphQL', 'WebSocket',
    '微服务', '分布式', 'CI/CD', 'Jenkins', 'GitLab', 'GitHub Actions',
    '高并发', '高可用', '缓存', '消息队列', 'RabbitMQ', 'Kafka', 'RocketMQ',
    'Flutter', 'React Native', 'Electron', '小程序',
    'TensorFlow', 'PyTorch', '机器学习', '深度学习', 'LLM',
    'HTML', 'CSS', 'Sass', 'Less', 'Tailwind',
    'Jest', 'Vitest', 'Cypress', 'Playwright',
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
        ? p.techStack.split(/[,，、]/).map((s) => s.trim()).filter(Boolean)
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

    const name = existing.name || makeProjectName(
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
  const jobDescription = jobData.jobDescription || '';
  const experience = jobData.experience || '';
  // 合并：页面提取技能 + JD 再扫一遍
  const skills = [
    ...new Set([
      ...(jobData.skills || []),
      ...extractSkillsFromText(jobDescription),
    ]),
  ];
  const skillList =
    skills.length > 0 ? skills.join('、') : '（未提取到明确技能，请从职位描述中归纳）';

  const prompt = `你是一位专业的职业顾问。请深度分析以下职位描述，生成全面、详细的岗位洞察。

职位描述：
${jobDescription}

【岗位核心技能点】（必须优先使用，生成项目时严格对齐）：
${skillList}

经验要求：
${experience}

请以JSON格式返回，包含以下字段（不要返回其他内容，只返回JSON）：
{
  "position": "职位名称",
  "company": "公司名称（如能识别）",
  "department": "所属部门/团队（如能识别，否则留空）",
  "salaryRange": "薪资范围（如能识别，否则留空）",
  "jobHighlights": ["岗位亮点1，如技术栈先进、团队大牛多", "岗位亮点2，如晋升空间、薪资竞争力", "岗位亮点3"],
  "coreRequirements": [
    "核心要求1：具体描述该岗位最看重的能力和条件",
    "核心要求2",
    "核心要求3"
  ],
  "keyResponsibilities": [
    "核心职责1：日常主要工作内容是什么",
    "核心职责2",
    "核心职责3"
  ],
  "skillMatch": {
    "matched": ["已匹配技能"],
    "missing": ["缺失技能"],
    "suggestions": [
      "针对每个缺失技能的具体提升路径，如：学习XX → 实战项目 → 面试准备"
    ]
  },
  "resumeTips": [
    "简历优化建议1：具体到某个模块怎么写，如项目经历要突出XX",
    "简历优化建议2",
    "简历优化建议3"
  ],
  "interviewPrep": [
    "面试准备要点1：具体要准备什么，如XX算法题、XX系统设计",
    "面试准备要点2",
    "面试准备要点3"
  ],
  "careerAdvice": {
    "growthPath": "该岗位的职业发展路径，如：初级→高级→架构师→技术总监",
    "industryTrend": "该岗位在行业中的趋势判断，如需求量、薪资走向",
    "transferableSkills": ["可迁移到其他岗位的技能1", "技能2"]
  },
  "projects": [
    {
      "name": "项目名称",
      "role": "个人角色，如独立开发/核心开发",
      "dates": "2024.01 - 2024.06",
      "techStack": ["技术1", "技术2"],
      "description": "项目背景、职责与可量化成果（2-4句）"
    }
  ]
}

【projects 硬性要求】
1. 生成 2-3 条「个人项目/练手项目」示例，供求职者参考修改。
2. 每条 project.techStack 中至少 70% 的技术名词必须来自上方【岗位核心技能点】列表（可保留写法一致）。
3. 所有岗位核心技能点应尽量分配到各项目中，避免多个项目都只用同一两个技能、忽略其余技能点。
4. description 必须自然嵌入至少 2 个岗位技能点名称。
5. 合理虚构即可；不要写成真实公司造假任职，不要编造雇主名称。
6. skillMatch.matched 尽量使用岗位核心技能点中的词。`;

  try {
    const response = await fetch(`${AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mimo-v2.5',
        messages: [
          {
            role: 'system',
            content:
              '你是职业顾问。只返回JSON。projects 的 techStack 必须高度匹配用户给出的岗位核心技能点，禁止用无关技术栈凑数。',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (!content || content.trim() === '') {
      throw new Error('API返回内容为空（推理模型可能消耗了所有token）');
    }

    let cleaned = content.trim();
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    // 本地强制对齐：把提取到的技能并入 projects
    parsed.projects = alignProjectsWithSkills(parsed.projects, skills);
    if (!parsed.skillMatch) {
      parsed.skillMatch = { matched: [], missing: [], suggestions: [] };
    }
    if (!parsed.skillMatch.matched?.length && skills.length) {
      parsed.skillMatch.matched = skills.slice(0, 8);
    }
    parsed.extractedSkills = skills;
    return parsed;
  } catch (error) {
    console.error('AI分析错误:', error);
    return {
      position: '未知职位',
      coreRequirements: ['分析失败: ' + error.message],
      skillMatch: { matched: skills.slice(0, 8), missing: [], suggestions: [] },
      resumeTips: ['请稍后重试'],
      interviewPrep: ['请稍后重试'],
      projects: alignProjectsWithSkills([], skills),
      extractedSkills: skills,
    };
  }
}

/**
 * 保存简历到本地存储
 * @param {Object} resume - 简历数据
 */
export async function saveResume(resume) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set({ resume }, () => {
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
          resolve(result.resume || null);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
