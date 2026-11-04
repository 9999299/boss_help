import {
  confirmExperience,
  createExperience,
  hasConfirmedExperience,
  libraryStats,
  loadCareerLibrary,
  mergeImportedExperiences,
  normalizeCareerLibrary,
  saveCareerLibrary,
  updateExperience,
} from '../utils/careerLibrary';

describe('职业经历库', () => {
  beforeEach(() => {
    global.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          get: jest.fn((keys, callback) => callback({})),
          set: jest.fn((value, callback) => callback && callback()),
        },
      },
    };
  });

  test('规范化工作/项目经历并保留真实来源标记', () => {
    const library = normalizeCareerLibrary({
      experiences: [
        {
          id: 'exp_1',
          kind: 'employment',
          organization: '某公司',
          title: '后端工程师',
          userConfirmed: true,
          data: { responsibilities: ['使用 Go 开发服务'] },
        },
        {
          id: 'prj_1',
          kind: 'project',
          organization: 'ERP 项目',
          data: { techStack: ['Go', 'MySQL'] },
        },
      ],
    });
    expect(library.experiences).toHaveLength(2);
    expect(library.experiences[0]).toMatchObject({
      id: 'exp_1',
      userConfirmed: true,
      data: { responsibilities: ['使用 Go 开发服务'] },
    });
    expect(library.experiences[1].data.techStack).toEqual(['Go', 'MySQL']);
  });

  test('编辑经历后自动取消已核实状态，必须重新确认', () => {
    const library = normalizeCareerLibrary({
      experiences: [
        {
          id: 'exp_1',
          kind: 'employment',
          organization: '某公司',
          userConfirmed: true,
          data: { responsibilities: ['旧职责'] },
        },
      ],
    });
    const edited = updateExperience(library, 'exp_1', {
      organization: '新公司',
    });
    expect(edited.experiences[0].organization).toBe('新公司');
    expect(edited.experiences[0].userConfirmed).toBe(false);
    const confirmed = confirmExperience(edited, 'exp_1', true);
    expect(hasConfirmedExperience(confirmed)).toBe(true);
  });

  test('统计和导入合并不会覆盖已有经历', () => {
    const library = normalizeCareerLibrary({
      experiences: [createExperience('employment')],
    });
    const merged = mergeImportedExperiences(library, [
      {
        id: 'exp_imported',
        kind: 'employment',
        organization: '导入公司',
        userConfirmed: false,
        data: {},
      },
      { id: library.experiences[0].id, kind: 'project' },
    ]);
    expect(merged.experiences).toHaveLength(2);
    expect(libraryStats(merged)).toMatchObject({
      employment: 2,
      project: 0,
      confirmed: 0,
    });
  });

  test('保存时写入更新时间和规范化结构，加载时兼容旧数据', async () => {
    chrome.storage.local.get.mockImplementation((keys, callback) =>
      callback({
        careerLibrary: {
          experiences: [{ id: 'exp_old', kind: 'employment' }],
        },
      })
    );
    const loaded = await loadCareerLibrary();
    expect(loaded.experiences[0]).toMatchObject({
      id: 'exp_old',
      userConfirmed: false,
    });
    const saved = await saveCareerLibrary(loaded);
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});
