const baseManifest = require('../../public/manifest.json');
const { buildManifest } = require('../../scripts/manifest.cjs');

describe('Chrome manifest 构建', () => {
  test('生产构建只允许访问配置的分析 API origin', () => {
    const manifest = buildManifest(
      baseManifest,
      'https://resume-api.example.com'
    );

    expect(manifest.host_permissions).toContain(
      'https://resume-api.example.com/*'
    );
    expect(manifest.host_permissions).toContain('https://www.zhipin.com/*');
    expect(manifest.host_permissions).toContain('https://*.zhipin.com/*');
    expect(manifest.host_permissions).not.toContain('<all_urls>');
    expect(manifest.content_scripts).toBeUndefined();
  });

  test('本地开发构建允许 localhost API，但仍不注入所有页面', () => {
    const manifest = buildManifest(baseManifest, 'http://localhost:3000/');

    expect(manifest.host_permissions).toContain('http://localhost:3000/*');
    expect(manifest.host_permissions).toContain('https://www.zhipin.com/*');
    expect(manifest.content_scripts).toBeUndefined();
  });

  test('拒绝非 HTTP API 地址', () => {
    expect(() => buildManifest(baseManifest, 'file:///tmp/api')).toThrow(
      'ANALYZE_API_URL'
    );
  });

  test('action 不配置 default_popup，确保点击图标打开侧边栏并授予 activeTab', () => {
    const manifest = buildManifest(baseManifest, 'http://localhost:3000/');

    expect(manifest.action.default_popup).toBeUndefined();
  });
});
