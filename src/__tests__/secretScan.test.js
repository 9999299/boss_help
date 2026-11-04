const { findSecrets } = require('../../scripts/check-secrets.cjs');

describe('密钥扫描', () => {
  test('识别常见模型 API key', () => {
    const sk = `sk-${'a'.repeat(32)}`;
    const tp = `tp-${'b'.repeat(32)}`;
    expect(findSecrets(`Authorization: Bearer ${sk}`)).toHaveLength(1);
    expect(findSecrets(`token ${tp}`)).toHaveLength(1);
  });

  test('普通配置和占位符不被误报', () => {
    expect(findSecrets('AI_API_KEY=your_api_key_here')).toEqual([]);
    expect(findSecrets('https://api.example.com/v1')).toEqual([]);
  });
});
