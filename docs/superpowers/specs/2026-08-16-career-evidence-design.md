# 岗位定制化求职材料设计

## 目标与边界

将现有 Chrome 扩展从“职位分析 + 简历草稿”扩展为“岗位定制化求职材料助手”：根据职位描述生成可编辑的项目经历、候选公司经历和个人优势，并把这些内容纳入简历预览与导出。

生成内容必须是求职者修改的草稿，不得暗示 AI 生成的项目或公司经历是真实发生的任职经历。公司信息统一显示“候选公司/待核实”，项目经历显示“示例项目/请按实际修改”。每条生成内容默认 `userConfirmed: false`；用户在编辑器中勾选“我已按实际情况核实”后才变为 `true`，取消勾选、编辑内容或重新生成会重置为 `false`。未核实条目仍可导出，但导出标题和条目旁必须保留状态标签。

## 方案选择

采用混合公司来源方案：

1. 优先从当前职位页面和用户主动提供的相关岗位文本中提取公司名、行业、岗位名称和地点；
2. 页面提取不到时，让模型根据岗位和行业生成少量候选公司；
3. 不自动抓取搜索结果、不绕过登录或反爬限制；候选数据只作为匹配参考，用户必须确认真实性。

这样可以利用 BOSS 页面上下文，又避免把站点结构和外部抓取服务绑定为核心依赖。

## 数据模型

分析结果增加以下字段（字段均可选，由服务端和前端 normalize 时补默认值）：

```js
{
  projects: [{
    name, role, dates, techStack: [], description, achievements: [],
    source: 'model' | 'user', evidenceStatus: 'example', userConfirmed: false
  }],
  companyCandidates: [{
    company, industry, role, location, matchReason, suggestedResponsibilities: [],
    source: 'page' | 'model' | 'user', evidenceStatus: 'candidate', userConfirmed: false
  }],
  strengths: [{
    title, description, evidenceSuggestions: [], keywords: [],
    source: 'model' | 'user', evidenceStatus: 'draft', userConfirmed: false
  }],
  extractedSkills: []
}
```

简历保存结构统一为：

```js
{
  schemaVersion: 2,
  personalInfo, skills, experience: [], education: [],
  projects: [], companyCandidates: [], strengths: []
}
```

`companyCandidates` 与真实工作经历 `experience` 永远分离，不能自动合并。`evidenceStatus`、`source`、`userConfirmed` 是强制的 UI/导出元数据。编辑器中新建的项目、公司候选和优势统一使用 `source: 'user'`、对应类型的 `evidenceStatus`，以及 `userConfirmed: false`。旧数据加载时补空的新增数组；旧项目补 `achievements: []`、`source: 'user'`、`evidenceStatus: 'example'`、`userConfirmed: false`，保存时升级为 v2。`achievements` 必须在编辑、保存、JSON/PDF 导出中保留。

## 数据流与 API

扩展前端只调用配置的非敏感服务地址 `${ANALYZE_API_URL}/api/analyze`（开发环境允许 localhost，生产环境使用 Vercel 部署地址），模型密钥只存在服务端环境变量中。服务端接收：

```js
{ jobData: { jobDescription, skills, experience, pageUrl, pageTitle, companyHints } }
```

服务端统一构造 prompt、解析 JSON、校验字段和数组长度（职位描述最多 12,000 字符，技能最多 100 个，公司提示最多 30 个），并返回规范化结果。请求不记录职位全文、URL 查询参数或 API 凭据；模型输入中的网页内容视为不可信数据，只作为待分析文本，不能改变系统指令。模型错误或非 JSON 返回 502，超时返回 504，输入过大返回 413，限流返回 429；前端展示可重试状态，不把错误包装成成功分析。CORS 只允许 `ALLOWED_ORIGINS` 配置的扩展来源和本地开发来源。

用户提供的测试 base URL/API key 只通过临时环境变量注入测试命令，禁止写入 `src/config.js`、仓库、测试快照或 `dist`。

## 页面交互

在现有“职位分析 / 简历编辑 / 导出”基础上：

- 分析结果页增加“候选公司”和“个人优势”两个区块；
- 简历编辑器增加公司经历候选和个人优势编辑区，每个条目可新增、删除、修改，并提供核实复选框；
- 项目、公司、优势条目均显示草稿状态提示；未核实条目显示“待核实/示例”标签，核实后显示“已核实”；
- “查找类似岗位”继续使用用户主动点击打开的 BOSS 搜索，不自动提交或代表用户沟通；
- 没有分析结果时，编辑器显示空状态和填写提示。

## 导出

JSON 导出保留完整结构、`achievements`、`evidenceStatus` 和 `userConfirmed`。PDF 展示项目经历、公司经历候选和个人优势，并在候选/示例区块标题和每个未核实条目旁保留“待核实/请按实际修改”提示。Word 按钮在真正实现前显示“暂未支持”，README 同步说明。

## 安全与隐私

- 删除前端 API key 注入逻辑；构建产物扫描不得出现常见密钥格式（`sk-`、`tp-` 及配置文件中的完整值），扫描脚本以非零退出码阻断验证。
- 移除全站 `content_scripts` 和用于页面抓取的 `<all_urls>`；保留 `activeTab`、`scripting`、`sidePanel`、`storage`，仅在用户点击“从页面提取”时对当前活动标签执行提取。对 `chrome://`、Chrome Web Store 等不可注入页面显示手动输入回退。
- webpack 根据公开的 `ANALYZE_API_URL` 生成 manifest：生产构建只加入生产 API origin 的 `host_permissions`，开发构建只额外加入 localhost API origin。API URL 必须是构建时非敏感配置，manifest 构建测试断言不同环境只包含对应 origin，不能恢复 `<all_urls>`。
- 提取时传入 `pageUrl`、`pageTitle` 和页面可见的公司提示；发送前在分析按钮附近显示“页面文字将发送给 AI 服务”的提示。
- API 对请求大小做上限校验，避免把整页无界文本发送给模型。
- 页面内容发送到模型前提示用户，并在错误信息中避免回显职位全文或凭据。

## 测试策略

先写失败测试，再实现：

1. API 配置不会从源码注入密钥，前端请求指向后端；
2. 解析结果能规范化项目、公司候选和优势，缺失字段有默认值；旧 resume 迁移 fixture 断言新增数组，以及旧 project 的 `achievements/source/evidenceStatus/userConfirmed` 默认值；
3. API handler 覆盖 OPTIONS/405/400/413/502/504/429 和成功响应；
4. 失败 API 返回可识别错误，UI 显示重试状态；
5. 简历编辑器能编辑、新增、删除和核实新字段，并断言编辑或重新生成后 `userConfirmed` 重置；
6. JSON/PDF 输出包含新字段、`achievements` 和状态标记，并转义用户/模型文本防止 HTML 注入；
7. 构建后扫描脚本对密钥模式命中时退出非零；
8. manifest 构建测试分别断言生产/开发 API origin，且不包含 `<all_urls>`；
9. 使用 Jest/React Testing Library 覆盖上述 fixtures，并运行 `npm test -- --runInBand`、`npm run lint`、`npm run build` 和密钥扫描命令；Chrome 手工 smoke test 验证侧边栏、不可注入页面回退和完整分析流程。
