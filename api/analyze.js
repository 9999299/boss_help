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
    if (!req.body || !req.body.jobData) {
      return res.status(400).json({ error: 'Missing jobData in request body' });
    }
    const { jobData } = req.body;
    const result = await analyzeJob(jobData);
    return res.status(200).json(result);
  } catch (error) {
    console.error('请求处理错误:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports.analyzeJob = analyzeJob;