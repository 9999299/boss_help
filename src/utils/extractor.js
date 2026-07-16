/* globals DOMParser, module */

/**
 * 提取职位描述
 * @param {string} html - 页面HTML内容
 * @returns {string} 职位描述文本
 */
function extractJobDescription(html) {
  // 创建临时DOM元素解析HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 尝试常见职位描述容器选择器
  const selectors = [
    '.job-description',
    '.job-detail',
    '.position-content',
    '[class*="job"]',
    '[class*="position"]',
    'article',
    'main',
  ];

  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      return element.textContent.trim();
    }
  }

  // 如果没有找到特定容器，返回整个页面文本
  return doc.body.textContent.trim();
}

/**
 * 提取技能要求
 * @param {string} text - 职位描述文本
 * @returns {string[]} 技能列表
 */
function extractSkills(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const skillKeywords = [
    'React',
    'Vue',
    'Angular',
    'Node.js',
    'TypeScript',
    'JavaScript',
    'HTML',
    'CSS',
    'Python',
    'Java',
    'Go',
    'Rust',
    'Docker',
    'Kubernetes',
    'AWS',
    'Azure',
    'GCP',
    'SQL',
    'MongoDB',
    'Redis',
    'Git',
  ];

  const foundSkills = [];
  const lowerText = text.toLowerCase();

  skillKeywords.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });

  return foundSkills;
}

/**
 * 提取经验要求
 * @param {string} text - 职位描述文本
 * @returns {string} 经验要求描述
 */
function extractExperience(text) {
  if (!text || typeof text !== 'string') {
    return '经验要求未明确';
  }

  const experiencePatterns = [
    /(\d+)\s*年以上?.*?经验/g,
    /经验.*?(\d+)\s*年/g,
    /(\d+)\s*年.*?经验/g,
  ];

  for (const pattern of experiencePatterns) {
    const match = pattern.exec(text);
    if (match) {
      return `${match[1]}年经验`;
    }
  }

  return '经验要求未明确';
}

module.exports = {
  extractJobDescription,
  extractSkills,
  extractExperience,
};
