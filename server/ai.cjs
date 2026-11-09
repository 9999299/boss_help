const OpenAI = require('openai');

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 120000;

function reasoningParams() {
  const value = String(process.env.AI_REASONING || '').toLowerCase();
  if (['off', 'none', 'false', 'disabled'].includes(value)) {
    return { reasoning: { enabled: false } };
  }
  if (['low', 'medium', 'high'].includes(value)) {
    return { reasoning: { effort: value } };
  }
  return {};
}

function createModelClient() {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    const error = new Error('AI 服务未配置 AI_API_KEY');
    error.statusCode = 503;
    error.code = 'AI_NOT_CONFIGURED';
    throw error;
  }
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.AI_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
    timeout: DEFAULT_TIMEOUT_MS,
  });
  const model = process.env.AI_MODEL || 'mimo-v2.5';

  async function completeText({ system, user, maxTokens = 6000, signal }) {
    const requestOptions = signal ? { signal } : undefined;
    if (process.env.AI_API_MODE === 'responses') {
      const response = await client.responses.create(
        {
          model,
          instructions: system,
          input: user,
          max_output_tokens: maxTokens,
        },
        requestOptions
      );
      if (response?.output_text) return response.output_text;
      for (const item of response?.output || []) {
        for (const content of item?.content || []) {
          if (content?.type === 'output_text' && content.text) {
            return content.text;
          }
        }
      }
      return '';
    }
    const completion = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.25,
        max_tokens: maxTokens,
        ...reasoningParams(),
      },
      requestOptions
    );
    return completion?.choices?.[0]?.message?.content || '';
  }

  return { completeText };
}

module.exports = { createModelClient };
