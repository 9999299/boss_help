console.log('Content script loaded');

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
  // 实现页面内容提取逻辑
  return {
    title: document.title,
    url: window.location.href,
    text: document.body.innerText,
  };
}
