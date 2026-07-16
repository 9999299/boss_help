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
