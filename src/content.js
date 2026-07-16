console.log('Content script loaded');

const {
  extractJobDescription,
  extractSkills,
  extractExperience,
} = require('./utils/extractor');

// 监听来自侧边栏的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    const content = extractPageContent();
    sendResponse({ content });
  }
  return true;
});

// 提取页面内容
function extractPageContent() {
  const html = document.documentElement.outerHTML;
  const text = document.body.innerText;

  const jobDescription = extractJobDescription(html);
  const skills = extractSkills(text);
  const experience = extractExperience(text);

  return {
    title: document.title,
    url: window.location.href,
    jobDescription,
    skills,
    experience,
    fullText: text,
  };
}
