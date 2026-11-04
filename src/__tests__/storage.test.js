import { loadResume, saveResume } from '../utils/api';

describe('简历存储 v2', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          set: jest.fn((value, callback) => callback()),
          get: jest.fn((keys, callback) =>
            callback({
              resume: {
                personalInfo: { name: '旧简历' },
                projects: [{ name: '旧项目' }],
              },
            })
          ),
        },
      },
    };
  });

  test('保存时写入 schemaVersion 2 和新增数组', async () => {
    await saveResume({ personalInfo: { name: '张三' }, projects: [] });
    const stored = chrome.storage.local.set.mock.calls[0][0].resume;
    expect(stored.schemaVersion).toBe(2);
    expect(stored.companyCandidates).toEqual([]);
    expect(stored.strengths).toEqual([]);
  });

  test('加载旧简历时自动迁移', async () => {
    const loaded = await loadResume();
    expect(loaded.schemaVersion).toBe(2);
    expect(loaded.projects[0]).toMatchObject({
      source: 'user',
      userConfirmed: false,
    });
  });
});
