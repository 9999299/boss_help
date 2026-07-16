# Chrome扩展：AI职位识别简历生成器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个Chrome扩展插件，通过AI自动识别网页上的职位要求并生成针对性简历。

**Architecture:** 采用混合架构，前端使用Chrome扩展侧边栏UI，后端使用Vercel Functions云函数。前端提取页面内容并发送到后端，后端调用AI API分析职位要求并生成简历内容。

**Tech Stack:** React, Node.js, Vercel Functions, OpenAI API, Jest, Webpack

## Global Constraints
- Chrome扩展API兼容性：Manifest V3
- Node.js版本：>=18.0.0
- React版本：>=18.0.0
- 测试覆盖率：>=80%
- 代码风格：ESLint + Prettier

---

## 文件结构

### 前端文件
- `public/manifest.json` - Chrome扩展配置文件
- `public/sidebar.html` - 侧边栏HTML结构
- `src/content.js` - 内容脚本，提取页面内容
- `src/background.js` - 后台脚本，管理扩展生命周期
- `src/sidebar/Sidebar.jsx` - 侧边栏主组件
- `src/sidebar/components/JobAnalyzer.jsx` - 职位分析组件
- `src/sidebar/components/ResumeEditor.jsx` - 简历编辑器组件
- `src/sidebar/components/ExportPanel.jsx` - 导出面板组件
- `src/utils/api.js` - API通信工具
- `src/utils/extractor.js` - 页面内容提取工具
- `src/styles/sidebar.css` - 侧边栏样式
- `package.json` - 前端依赖配置
- `webpack.config.js` - Webpack配置

### 后端文件
- `api/analyze.js` - 职位分析云函数
- `api/package.json` - 后端依赖配置
- `vercel.json` - Vercel部署配置

### 测试文件
- `src/__tests__/content.test.js` - 内容脚本测试
- `src/__tests__/extractor.test.js` - 提取工具测试
- `src/__tests__/api.test.js` - API工具测试
- `src/__tests__/Sidebar.test.js` - 侧边栏组件测试
- `api/__tests__/analyze.test.js` - 云函数测试

---

### Task 1: 项目初始化与基础架构搭建

**Files:**
- Create: `package.json`
- Create: `webpack.config.js`
- Create: `public/manifest.json`
- Create: `public/sidebar.html`
- Create: `src/content.js`
- Create: `src/background.js`
- Create: `src/styles/sidebar.css`

**Interfaces:**
- Consumes: 无
- Produces: 基础项目结构，可运行的Chrome扩展框架

- [ ] **Step 1: 初始化npm项目**

```bash
npm init -y
```

- [ ] **Step 2: 安装前端依赖**

```bash
npm install react react-dom react-scripts
npm install --save-dev webpack webpack-cli webpack-dev-server babel-loader @babel/core @babel/preset-env @babel/preset-react css-loader style-loader html-webpack-plugin
```

- [ ] **Step 3: 创建package.json脚本**

```json
{
  "name": "chrome-resume-generator",
  "version": "1.0.0",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

- [ ] **Step 4: 创建Webpack配置**

```javascript
// webpack.config.js
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: {
    sidebar: './src/sidebar/Sidebar.jsx',
    content: './src/content.js',
    background: './src/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/sidebar.html',
      filename: 'sidebar.html',
      chunks: ['sidebar']
    })
  ],
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
```

- [ ] **Step 5: 创建Chrome扩展manifest.json**

```json
// public/manifest.json
{
  "manifest_version": 3,
  "name": "AI Resume Generator",
  "version": "1.0.0",
  "description": "通过AI识别职位要求并生成针对性简历",
  "permissions": ["activeTab", "scripting", "sidePanel"],
  "action": {
    "default_popup": "sidebar.html",
    "default_title": "AI Resume Generator"
  },
  "side_panel": {
    "default_path": "sidebar.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

- [ ] **Step 6: 创建侧边栏HTML**

```html
<!-- public/sidebar.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Resume Generator</title>
</head>
<body>
  <div id="sidebar-root"></div>
</body>
</html>
```

- [ ] **Step 7: 创建内容脚本**

```javascript
// src/content.js
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
    text: document.body.innerText
  };
}
```

- [ ] **Step 8: 创建后台脚本**

```javascript
// src/background.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

- [ ] **Step 9: 创建基础样式**

```css
/* src/styles/sidebar.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 400px;
  min-height: 500px;
  background-color: #f5f5f5;
}

.sidebar-container {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.header h1 {
  font-size: 18px;
  color: #333;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn:hover {
  opacity: 0.9;
}
```

- [ ] **Step 10: 提交初始代码**

```bash
git add .
git commit -m "feat: 初始化项目基础架构"
```

---

### Task 2: 内容提取模块开发

**Files:**
- Create: `src/utils/extractor.js`
- Create: `src/__tests__/extractor.test.js`
- Modify: `src/content.js`

**Interfaces:**
- Consumes: 无
- Produces: `extractPageContent()` 函数，返回结构化页面内容

- [ ] **Step 1: 编写提取工具测试**

```javascript
// src/__tests__/extractor.test.js
const { extractJobDescription, extractSkills, extractExperience } = require('../utils/extractor');

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
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- --testPathPattern=extractor.test.js
```

预期：FAIL，因为函数未定义

- [ ] **Step 3: 实现提取工具**

```javascript
// src/utils/extractor.js

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
    'main'
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
  const skillKeywords = [
    'React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'JavaScript',
    'HTML', 'CSS', 'Python', 'Java', 'Go', 'Rust', 'Docker', 'Kubernetes',
    'AWS', 'Azure', 'GCP', 'SQL', 'MongoDB', 'Redis', 'Git'
  ];
  
  const foundSkills = [];
  const lowerText = text.toLowerCase();
  
  skillKeywords.forEach(skill => {
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
  const experiencePatterns = [
    /(\d+)\s*年以上?.*?经验/g,
    /经验.*?(\d+)\s*年/g,
    /(\d+)\s*年.*?经验/g
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
  extractExperience
};
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- --testPathPattern=extractor.test.js
```

预期：PASS

- [ ] **Step 5: 更新内容脚本**

```javascript
// src/content.js
const { extractJobDescription, extractSkills, extractExperience } = require('./utils/extractor');

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
    fullText: text
  };
}
```

- [ ] **Step 6: 提交代码**

```bash
git add src/utils/extractor.js src/__tests__/extractor.test.js src/content.js
git commit -m "feat: 实现页面内容提取模块"
```

---

### Task 3: 云函数开发

**Files:**
- Create: `api/analyze.js`
- Create: `api/package.json`
- Create: `vercel.json`
- Create: `api/__tests__/analyze.test.js`

**Interfaces:**
- Consumes: 页面内容数据
- Produces: `analyzeJob()` 函数，返回AI分析结果

- [ ] **Step 1: 编写云函数测试**

```javascript
// api/__tests__/analyze.test.js
const { analyzeJob } = require('../analyze');

describe('analyzeJob', () => {
  test('analyzeJob 分析职位描述并返回结构化数据', async () => {
    const jobData = {
      jobDescription: '前端开发工程师，负责React应用开发',
      skills: ['React', 'JavaScript'],
      experience: '3年经验'
    };
    
    const result = await analyzeJob(jobData);
    
    expect(result).toHaveProperty('position');
    expect(result).toHaveProperty('requirements');
    expect(result).toHaveProperty('suggestions');
    expect(Array.isArray(result.requirements)).toBe(true);
  });

  test('analyzeJob 处理空输入', async () => {
    const jobData = {
      jobDescription: '',
      skills: [],
      experience: ''
    };
    
    const result = await analyzeJob(jobData);
    expect(result).toHaveProperty('position');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
cd api && npm test -- --testPathPattern=analyze.test.js
```

预期：FAIL，因为函数未定义

- [ ] **Step 3: 创建后端依赖配置**

```json
// api/package.json
{
  "name": "api",
  "version": "1.0.0",
  "description": "AI Resume Generator API",
  "main": "analyze.js",
  "scripts": {
    "test": "jest"
  },
  "dependencies": {
    "openai": "^4.0.0",
    "node-fetch": "^2.6.1"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [ ] **Step 4: 安装后端依赖**

```bash
cd api && npm install
```

- [ ] **Step 5: 实现云函数**

```javascript
// api/analyze.js
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 分析职位要求
 * @param {Object} jobData - 职位数据
 * @returns {Object} 分析结果
 */
async function analyzeJob(jobData) {
  const { jobDescription, skills, experience } = jobData;
  
  const prompt = `
你是一位专业的职业顾问。请分析以下职位描述，并生成针对性的简历建议。

职位描述：
${jobDescription}

技能要求：
${skills.join(', ')}

经验要求：
${experience}

请提供：
1. 职位核心要求总结
2. 技能匹配度分析
3. 简历优化建议
4. 面试准备要点

请以JSON格式返回，包含以下字段：
{
  "position": "职位名称",
  "coreRequirements": ["核心要求1", "核心要求2"],
  "skillMatch": {
    "matched": ["已匹配技能"],
    "missing": ["缺失技能"],
    "suggestions": ["技能提升建议"]
  },
  "resumeTips": ["简历优化建议1", "简历优化建议2"],
  "interviewPrep": ["面试准备要点1", "面试准备要点2"]
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的职业顾问，擅长分析职位要求并提供简历优化建议。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    return JSON.parse(response);
  } catch (error) {
    console.error('AI分析错误:', error);
    return {
      position: '未知职位',
      coreRequirements: ['分析失败'],
      skillMatch: { matched: [], missing: [], suggestions: [] },
      resumeTips: ['请稍后重试'],
      interviewPrep: ['请稍后重试']
    };
  }
}

/**
 * Vercel云函数处理程序
 */
module.exports = async (req, res) => {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { jobData } = req.body;
    const result = await analyzeJob(jobData);
    return res.status(200).json(result);
  } catch (error) {
    console.error('请求处理错误:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports.analyzeJob = analyzeJob;
```

- [ ] **Step 6: 运行测试验证通过**

```bash
cd api && npm test -- --testPathPattern=analyze.test.js
```

预期：PASS

- [ ] **Step 7: 创建Vercel配置**

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "api/analyze.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "api/analyze.js"
    }
  ]
}
```

- [ ] **Step 8: 提交代码**

```bash
git add api/ vercel.json
git commit -m "feat: 实现职位分析云函数"
```

---

### Task 4: 侧边栏UI组件开发

**Files:**
- Create: `src/sidebar/Sidebar.jsx`
- Create: `src/sidebar/components/JobAnalyzer.jsx`
- Create: `src/sidebar/components/ResumeEditor.jsx`
- Create: `src/sidebar/components/ExportPanel.jsx`
- Create: `src/__tests__/Sidebar.test.js`

**Interfaces:**
- Consumes: `extractPageContent()` 从content.js, `analyzeJob()` 从api.js
- Produces: 完整的侧边栏UI界面

- [ ] **Step 1: 编写侧边栏组件测试**

```javascript
// src/__tests__/Sidebar.test.js
const React = require('react');
const { render, screen, fireEvent, waitFor } = require('@testing-library/react');
const Sidebar = require('../sidebar/Sidebar');

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

describe('Sidebar', () => {
  test('渲染侧边栏标题', () => {
    render(<Sidebar />);
    expect(screen.getByText('AI Resume Generator')).toBeInTheDocument();
  });

  test('显示分析按钮', () => {
    render(<Sidebar />);
    expect(screen.getByText('分析职位')).toBeInTheDocument();
  });

  test('点击分析按钮触发分析', async () => {
    const mockAnalyze = jest.fn();
    render(<Sidebar onAnalyze={mockAnalyze} />);
    
    fireEvent.click(screen.getByText('分析职位'));
    expect(mockAnalyze).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 安装测试依赖**

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest
```

- [ ] **Step 3: 运行测试验证失败**

```bash
npm test -- --testPathPattern=Sidebar.test.js
```

预期：FAIL，因为组件未定义

- [ ] **Step 4: 创建API通信工具**

```javascript
// src/utils/api.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-vercel-app.vercel.app';

/**
 * 分析职位要求
 * @param {Object} jobData - 职位数据
 * @returns {Object} 分析结果
 */
export async function analyzeJob(jobData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobData })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}

/**
 * 保存简历到本地存储
 * @param {Object} resume - 简历数据
 */
export async function saveResume(resume) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ resume }, resolve);
  });
}

/**
 * 从本地存储加载简历
 * @returns {Object} 简历数据
 */
export async function loadResume() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['resume'], (result) => {
      resolve(result.resume || null);
    });
  });
}
```

- [ ] **Step 5: 创建职位分析组件**

```jsx
// src/sidebar/components/JobAnalyzer.jsx
import React, { useState } from 'react';

const JobAnalyzer = ({ onAnalyze, isLoading }) => {
  const [jobData, setJobData] = useState({
    jobDescription: '',
    skills: [],
    experience: ''
  });

  const handleExtractFromPage = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });
      
      if (response && response.content) {
        setJobData(response.content);
      }
    } catch (error) {
      console.error('提取页面内容失败:', error);
      alert('无法提取页面内容，请手动输入');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAnalyze(jobData);
  };

  return (
    <div className="job-analyzer">
      <h3>职位分析</h3>
      
      <button 
        className="btn btn-secondary"
        onClick={handleExtractFromPage}
        disabled={isLoading}
      >
        从页面提取
      </button>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>职位描述：</label>
          <textarea
            value={jobData.jobDescription}
            onChange={(e) => setJobData({...jobData, jobDescription: e.target.value})}
            placeholder="粘贴职位描述..."
            rows={6}
          />
        </div>
        
        <div className="form-group">
          <label>技能要求（逗号分隔）：</label>
          <input
            type="text"
            value={jobData.skills.join(', ')}
            onChange={(e) => setJobData({...jobData, skills: e.target.value.split(',').map(s => s.trim())})}
            placeholder="React, Vue, Node.js"
          />
        </div>
        
        <div className="form-group">
          <label>经验要求：</label>
          <input
            type="text"
            value={jobData.experience}
            onChange={(e) => setJobData({...jobData, experience: e.target.value})}
            placeholder="3年以上开发经验"
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading || !jobData.jobDescription}
        >
          {isLoading ? '分析中...' : '分析职位'}
        </button>
      </form>
    </div>
  );
};

export default JobAnalyzer;
```

- [ ] **Step 6: 创建简历编辑器组件**

```jsx
// src/sidebar/components/ResumeEditor.jsx
import React, { useState, useEffect } from 'react';

const ResumeEditor = ({ initialData, onSave }) => {
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      summary: ''
    },
    skills: [],
    experience: [],
    education: []
  });

  useEffect(() => {
    if (initialData) {
      setResumeData(initialData);
    }
  }, [initialData]);

  const handlePersonalInfoChange = (field, value) => {
    setResumeData({
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        [field]: value
      }
    });
  };

  const handleSave = () => {
    onSave(resumeData);
  };

  return (
    <div className="resume-editor">
      <h3>简历编辑器</h3>
      
      <div className="section">
        <h4>个人信息</h4>
        <input
          type="text"
          placeholder="姓名"
          value={resumeData.personalInfo.name}
          onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
        />
        <input
          type="email"
          placeholder="邮箱"
          value={resumeData.personalInfo.email}
          onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
        />
        <input
          type="tel"
          placeholder="电话"
          value={resumeData.personalInfo.phone}
          onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
        />
        <textarea
          placeholder="个人简介"
          value={resumeData.personalInfo.summary}
          onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
          rows={4}
        />
      </div>
      
      <div className="section">
        <h4>技能</h4>
        <div className="skills-list">
          {resumeData.skills.map((skill, index) => (
            <span key={index} className="skill-tag">
              {skill}
              <button onClick={() => {
                const newSkills = resumeData.skills.filter((_, i) => i !== index);
                setResumeData({...resumeData, skills: newSkills});
              }}>×</button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="添加技能（回车确认）"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const newSkill = e.target.value.trim();
              if (newSkill && !resumeData.skills.includes(newSkill)) {
                setResumeData({
                  ...resumeData,
                  skills: [...resumeData.skills, newSkill]
                });
                e.target.value = '';
              }
            }
          }}
        />
      </div>
      
      <button className="btn btn-primary" onClick={handleSave}>
        保存简历
      </button>
    </div>
  );
};

export default ResumeEditor;
```

- [ ] **Step 7: 创建导出面板组件**

```jsx
// src/sidebar/components/ExportPanel.jsx
import React from 'react';

const ExportPanel = ({ resumeData }) => {
  const exportAsJSON = () => {
    const dataStr = JSON.stringify(resumeData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'resume.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const exportAsPDF = async () => {
    // 这里将集成PDF生成库（如jsPDF）
    alert('PDF导出功能开发中...');
  };

  const exportAsWord = async () => {
    // 这里将集成Word生成库（如docx）
    alert('Word导出功能开发中...');
  };

  return (
    <div className="export-panel">
      <h3>导出简历</h3>
      
      <div className="export-options">
        <button className="btn btn-primary" onClick={exportAsJSON}>
          导出为JSON
        </button>
        
        <button className="btn btn-secondary" onClick={exportAsPDF}>
          导出为PDF
        </button>
        
        <button className="btn btn-secondary" onClick={exportAsWord}>
          导出为Word
        </button>
      </div>
      
      <div className="export-preview">
        <h4>预览</h4>
        <pre>{JSON.stringify(resumeData, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ExportPanel;
```

- [ ] **Step 8: 创建主侧边栏组件**

```jsx
// src/sidebar/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import JobAnalyzer from './components/JobAnalyzer';
import ResumeEditor from './components/ResumeEditor';
import ExportPanel from './components/ExportPanel';
import { analyzeJob, saveResume, loadResume } from '../utils/api';
import '../styles/sidebar.css';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('analyzer');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 加载保存的简历
    loadResume().then(data => {
      if (data) {
        setResumeData(data);
      }
    });
  }, []);

  const handleAnalyze = async (jobData) => {
    setIsLoading(true);
    try {
      const result = await analyzeJob(jobData);
      setAnalysisResult(result);
      
      // 基于分析结果生成简历草稿
      const draftResume = generateResumeDraft(result, jobData);
      setResumeData(draftResume);
      
      setActiveTab('editor');
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const generateResumeDraft = (analysis, jobData) => {
    return {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        summary: `寻求${analysis.position}职位，具备${jobData.experience}经验。`
      },
      skills: [
        ...(analysis.skillMatch?.matched || []),
        ...(jobData.skills || [])
      ],
      experience: [],
      education: []
    };
  };

  const handleSaveResume = async (data) => {
    await saveResume(data);
    setResumeData(data);
    alert('简历已保存');
  };

  return (
    <div className="sidebar-container">
      <div className="header">
        <h1>AI Resume Generator</h1>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'analyzer' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyzer')}
        >
          职位分析
        </button>
        <button 
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          简历编辑
        </button>
        <button 
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          导出
        </button>
      </div>
      
      <div className="content">
        {activeTab === 'analyzer' && (
          <JobAnalyzer onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}
        
        {activeTab === 'editor' && (
          <ResumeEditor initialData={resumeData} onSave={handleSaveResume} />
        )}
        
        {activeTab === 'export' && (
          <ExportPanel resumeData={resumeData} />
        )}
      </div>
      
      {analysisResult && (
        <div className="analysis-result">
          <h4>分析结果</h4>
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
```

- [ ] **Step 9: 运行测试验证通过**

```bash
npm test -- --testPathPattern=Sidebar.test.js
```

预期：PASS

- [ ] **Step 10: 提交代码**

```bash
git add src/sidebar/ src/__tests__/Sidebar.test.js src/utils/api.js
git commit -m "feat: 实现侧边栏UI组件"
```

---

### Task 5: 构建与测试

**Files:**
- Modify: `package.json`
- Create: `.eslintrc.js`
- Create: `.prettierrc`

**Interfaces:**
- Consumes: 所有之前创建的文件
- Produces: 可运行的Chrome扩展

- [ ] **Step 1: 配置ESLint**

```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  }
};
```

- [ ] **Step 2: 配置Prettier**

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

- [ ] **Step 3: 更新package.json脚本**

```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "jest",
    "lint": "eslint src/ --ext .js,.jsx",
    "lint:fix": "eslint src/ --ext .js,.jsx --fix",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/"
  }
}
```

- [ ] **Step 4: 运行lint检查**

```bash
npm run lint
```

预期：无错误或警告

- [ ] **Step 5: 运行格式化**

```bash
npm run format
```

- [ ] **Step 6: 运行所有测试**

```bash
npm test
```

预期：所有测试通过

- [ ] **Step 7: 构建扩展**

```bash
npm run build
```

预期：在`dist`目录生成构建文件

- [ ] **Step 8: 在Chrome中测试扩展**

1. 打开Chrome浏览器
2. 访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择`dist`目录
6. 测试扩展功能

- [ ] **Step 9: 提交代码**

```bash
git add .
git commit -m "feat: 完成构建配置和测试"
```

---

### Task 6: 文档与发布准备

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `LICENSE`

**Interfaces:**
- Consumes: 所有之前创建的文件
- Produces: 完整的项目文档和发布配置

- [ ] **Step 1: 创建.gitignore**

```gitignore
# 依赖
node_modules/
dist/
build/

# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# 日志
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 编辑器
.vscode/
.idea/
*.swp
*.swo

# 系统
.DS_Store
Thumbs.db

# 测试
coverage/

# Vercel
.vercel/
```

- [ ] **Step 2: 创建README.md**

```markdown
# AI Resume Generator

通过AI自动识别网页上的职位要求并生成针对性简历的Chrome扩展插件。

## 功能特性

- 🔍 **智能职位分析**：自动提取页面职位描述，分析关键技能要求
- 📝 **AI简历生成**：基于职位分析生成结构化简历内容
- ✏️ **在线编辑**：用户友好的简历编辑器，支持实时预览
- 📄 **多格式导出**：支持导出为JSON、PDF、Word格式
- 💾 **本地保存**：简历数据保存在浏览器本地，保护隐私

## 安装与使用

### 开发者安装

1. 克隆仓库
```bash
git clone https://github.com/yourusername/chrome-resume-generator.git
cd chrome-resume-generator
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm start
```

4. 在Chrome中加载扩展
- 访问 `chrome://extensions/`
- 启用"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择 `dist` 目录

### 使用方法

1. 打开包含职位描述的网页
2. 点击Chrome扩展图标，打开侧边栏
3. 点击"从页面提取"按钮自动提取职位信息
4. 点击"分析职位"按钮进行AI分析
5. 在"简历编辑"标签页编辑生成的简历
6. 在"导出"标签页选择格式导出

## 技术栈

- **前端**：React, Chrome Extension API
- **后端**：Vercel Functions, OpenAI API
- **构建**：Webpack, Babel
- **测试**：Jest, React Testing Library

## 开发指南

### 项目结构

```
chrome-resume-generator/
├── api/                    # 云函数
│   ├── analyze.js         # 职位分析函数
│   └── package.json
├── public/                # 静态文件
│   ├── manifest.json      # Chrome扩展配置
│   └── sidebar.html
├── src/                   # 源代码
│   ├── content.js         # 内容脚本
│   ├── background.js      # 后台脚本
│   ├── sidebar/           # 侧边栏组件
│   ├── utils/             # 工具函数
│   └── styles/            # 样式文件
├── tests/                 # 测试文件
└── package.json
```

### 运行测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
npm run format
```

### 构建生产版本

```bash
npm run build
```

## 配置说明

### 环境变量

创建 `.env.local` 文件：

```
REACT_APP_API_URL=your-vercel-app-url
OPENAI_API_KEY=your-openai-api-key
```

### Vercel部署

1. 安装Vercel CLI
```bash
npm i -g vercel
```

2. 部署云函数
```bash
vercel deploy
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

MIT License

## 联系方式

- 项目链接：https://github.com/yourusername/chrome-resume-generator
- 问题反馈：https://github.com/yourusername/chrome-resume-generator/issues
```

- [ ] **Step 3: 创建LICENSE**

```
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: 提交代码**

```bash
git add README.md .gitignore LICENSE
git commit -m "docs: 添加项目文档和配置文件"
```

- [ ] **Step 5: 最终测试**

```bash
npm test
npm run build
```

- [ ] **Step 6: 创建Git标签**

```bash
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

---

## 执行选项

**计划已完成并保存到 `docs/superpowers/plans/2026-07-16-chrome-resume-generator.md`。两种执行选项：**

**1. Subagent-Driven（推荐）** - 我为每个任务调度一个新鲜的代理，任务间进行审查，快速迭代

**2. Inline Execution** - 在当前会话中使用executing-plans执行任务，批量执行并设置检查点进行审查

**选择哪种方式？**