const {
  extractJobDescription,
  extractSkills,
  extractExperience,
} = require('../utils/extractor');

// Mock DOMParser for Node.js environment
class MockDOMParser {
  parseFromString(html) {
    // Simple HTML parser for testing
    const doc = {
      querySelector: (selector) => {
        // Simple selector matching for common patterns
        if (selector.startsWith('.')) {
          const className = selector.slice(1);
          const regex = new RegExp(`class="${className}"`, 'i');
          if (regex.test(html)) {
            // Extract content between the class tags (including nested content)
            const match = html.match(
              new RegExp(`class="${className}"[^>]*>([\\s\\S]*?)</div>`, 'i')
            );
            if (match) {
              // Remove HTML tags and return text content
              const textContent = match[1].replace(/<[^>]*>/g, ' ').trim();
              return { textContent };
            }
          }
        }
        return null;
      },
      body: {
        textContent: html.replace(/<[^>]*>/g, ' ').trim(),
      },
    };
    return doc;
  }
}

global.DOMParser = MockDOMParser;

describe('extractor', () => {
  test('extractJobDescription 从HTML提取职位描述', () => {
    const html = `
      <div class="job-description">
        <h1>前端开发工程师</h1>
        <p>负责公司Web应用开发</p>
        <ul>
          <li>精通React、Vue</li>
          <li>3年以上开发经验</li>
        </ul>
      </div>
    `;
    const result = extractJobDescription(html);
    expect(result).toContain('前端开发工程师');
    expect(result).toContain('React');
  });

  test('extractSkills 提取技能要求', () => {
    const text = '要求：精通React、Vue、Node.js，熟悉TypeScript';
    const skills = extractSkills(text);
    expect(skills).toContain('React');
    expect(skills).toContain('Vue');
    expect(skills).toContain('Node.js');
  });

  test('extractExperience 提取经验要求', () => {
    const text = '要求：3年以上前端开发经验，有大型项目经验优先';
    const experience = extractExperience(text);
    expect(experience).toContain('3年');
  });
});
