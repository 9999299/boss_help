/* global DOMParser */
console.log('Content script loaded');

function isStyleOrScriptContent(text) {
  return /(\{|\}|background:|color:|font-|margin:|padding:|border:|display:|position:)/i.test(text);
}

function isNoiseText(text) {
  // 导航、按钮、标签等噪音
  const noisePatterns = [
    /收藏.*?举报/,
    /微信扫码分享/,
    /不合适.*?举报/,
    /立即沟通/,
    /AI打招呼/,
    /去App/,
    /与BOSS随时沟通/,
    /工作地址/,
    /查看更多信息/,
    /求职工具升级/,
    /VIP尊享/,
    /去升级/,
    /\.wXk.*?[A-Za-z]{3,}/,  // 随机字符串
  ];
  return noisePatterns.some(p => p.test(text));
}

function extractJobDescription(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 尝试直接获取 innerText（在真实 DOM 中比 html 解析更准确）
  // 通过标记符提取职位描述内容
  const markers = ['【岗位职责】', '【岗位要求】', '岗位职责', '岗位要求', '职位描述', '工作内容'];

  // 先尝试 BOSS 直聘专用选择器
  const bossSelectors = [
    '.job-detail .job-sec-text',
    '.job-sec-text',
    '.job-detail-section .job-sec-text',
  ];

  for (const selector of bossSelectors) {
    const elements = doc.querySelectorAll(selector);
    for (const element of elements) {
      const text = (element.innerText || element.textContent || '').trim();
      if (!text || text.length < 20) continue;
      if (isStyleOrScriptContent(text)) continue;
      if (isNoiseText(text)) continue;
      return text.replace(/\s+/g, ' ').trim();
    }
  }

  // 通用选择器
  const generalSelectors = [
    '[class*="job-detail"]',
    '[class*="job-desc"]',
    '[class*="position-detail"]',
    '[class*="position-desc"]',
    '[class*="job-content"]',
    '[class*="requirement"]',
    '[class*="description"]',
    'article',
  ];

  for (const selector of generalSelectors) {
    const elements = doc.querySelectorAll(selector);
    for (const element of elements) {
      const text = (element.innerText || element.textContent || '').trim();
      if (!text || text.length < 30) continue;
      if (isStyleOrScriptContent(text)) continue;
      if (isNoiseText(text)) continue;

      // 检查是否包含职位描述标记
      const hasMarker = markers.some(m => text.includes(m));
      if (hasMarker || text.length > 100) {
        return text.replace(/\s+/g, ' ').trim();
      }
    }
  }

  // 兜底：从 body 中提取包含岗位职责的部分
  const bodyText = doc.body.innerText || doc.body.textContent || '';
  const cleanedBody = bodyText.replace(/\s+/g, ' ').trim();

  // 尝试找到岗位职责开始的位置
  const startIdx = cleanedBody.indexOf('【岗位职责】') !== -1
    ? cleanedBody.indexOf('【岗位职责】')
    : cleanedBody.indexOf('岗位职责');

  if (startIdx !== -1) {
    // 从岗位职责开始，截取到合适的位置
    const endMarkers = ['郎启旭', '今日活跃', '去App', '工作地址', '查看更多'];
    let endIdx = cleanedBody.length;
    for (const marker of endMarkers) {
      const idx = cleanedBody.indexOf(marker, startIdx + 50);
      if (idx !== -1 && idx < endIdx) {
        endIdx = idx;
      }
    }
    return cleanedBody.slice(startIdx, endIdx).trim();
  }

  return cleanedBody;
}

function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];
  const skillKeywords = [
    'React', 'Vue', 'Angular', 'Next.js', 'Nuxt.js',
    'Node.js', 'TypeScript', 'JavaScript', 'HTML', 'CSS',
    'Python', 'Java', 'Go', 'Golang', 'Rust', 'C++', 'C#', 'PHP',
    'Docker', 'Kubernetes', 'K8s', 'AWS', 'Azure', 'GCP',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Git', 'Linux', 'Nginx', 'RabbitMQ', 'Kafka',
    'gRPC', 'REST', 'GraphQL', '微服务', '分布式',
    'CI/CD', 'Jenkins', 'GitLab',
    'MySQL', 'Redis', 'MQ', 'RDB', 'NoSQL',
    '高并发', '高可用', '缓存', '消息队列',
  ];
  const found = [];
  const lowerText = text.toLowerCase();
  for (const skill of skillKeywords) {
    if (lowerText.includes(skill.toLowerCase()) && !found.includes(skill)) {
      found.push(skill);
    }
  }
  return found;
}

function extractExperience(text) {
  if (!text || typeof text !== 'string') return '经验要求未明确';

  // 匹配 "1-3年"、"3年以上"、"2年以上经验" 等格式
  const patterns = [
    /(\d+)[\s-]*\d*\s*年/,
    /经验\s*[:：]?\s*(\d+)\s*年/,
    /(\d+)\s*年以上/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return `${match[1]}年以上经验`;
  }
  return '经验要求未明确';
}

// 监听来自侧边栏的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    const html = document.documentElement.outerHTML;
    const text = document.body.innerText;
    sendResponse({
      content: {
        title: document.title,
        url: window.location.href,
        jobDescription: extractJobDescription(html),
        skills: extractSkills(text),
        experience: extractExperience(text),
        fullText: text,
      },
    });
  }
  return true;
});
