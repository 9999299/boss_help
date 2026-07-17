console.log('Content script loaded');

// 内联extractor函数，避免require
function extractJobDescription(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const selectors = [
    '.job-description', '.job-detail', '.position-content',
    '[class*="job"]', '[class*="position"]', 'article', 'main'
  ];
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) return element.textContent.trim();
  }
  return doc.body.textContent.trim();
}

function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];
  const skillKeywords = [
    'React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'JavaScript',
    'HTML', 'CSS', 'Python', 'Java', 'Go', 'Rust', 'Docker', 'Kubernetes',
    'AWS', 'Azure', 'GCP', 'SQL', 'MongoDB', 'Redis', 'Git'
  ];
  return skillKeywords.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
}

function extractExperience(text) {
  if (!text || typeof text !== 'string') return '经验要求未明确';
  const patterns = [
    /(\d+)\s*年以上?.*?经验/g,
    /经验.*?(\d+)\s*年/g,
    /(\d+)\s*年.*?经验/g
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) return `${match[1]}年经验`;
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
        fullText: text
      }
    });
  }
  return true;
});
