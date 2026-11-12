require('@testing-library/jest-dom');
const {
  fireEvent,
  render,
  screen,
  waitFor,
} = require('@testing-library/react');
const ExperienceCustomizer =
  require('../sidebar/components/ExperienceCustomizer').default;
const api = require('../utils/experienceApi');

jest.mock('../utils/experienceApi', () => ({
  createExperienceGeneration: jest.fn(),
  generateExampleProjects: jest.fn(),
  getAgentRun: jest.fn(),
  getAgentRunResult: jest.fn(),
  getExperienceGeneration: jest.fn(),
  listExperienceGenerations: jest.fn(),
  updateExperienceGeneration: jest.fn(),
  confirmExperienceGeneration: jest.fn(),
  regenerateBullet: jest.fn(),
  regenerateExperience: jest.fn(),
  retryAgentRun: jest.fn(),
  cancelAgentRun: jest.fn(),
}));

const jobData = {
  jobDescription: '岗位职责：负责 Go 后端开发。任职要求：Go、Gin、MySQL。',
};

const analysisResult = {
  position: 'Go 后端工程师',
  coreRequirements: ['Go', 'Gin', 'MySQL'],
};

const library = {
  experiences: [
    {
      id: 'exp_1',
      kind: 'employment',
      organization: '某公司',
      title: 'Go 后端工程师',
      startDate: '2021.03',
      endDate: '2023.06',
      userConfirmed: true,
      data: {
        description: '负责订单服务',
        responsibilities: ['使用 Go 和 Gin 开发订单服务'],
        achievements: [],
      },
    },
  ],
};

const generation = {
  id: 'gen_1',
  jobId: 'job_1',
  versionNo: 1,
  status: 'draft',
  resultJson: {
    job_analysis: {
      job_title: 'Go 后端工程师',
      key_requirements: ['Go', 'Gin'],
    },
    match_summary: {
      score: 82,
      matched: ['Go', 'Gin'],
      partial: [],
      missing: [],
    },
    work_experiences: [
      {
        source_experience_id: 'exp_1',
        company: '某公司',
        position: 'Go 后端工程师',
        start_date: '2021.03',
        end_date: '2023.06',
        bullets: [
          {
            claim_id: 'claim_1',
            text: '使用 Go、Gin 开发订单服务',
            original_text: '使用 Go 和 Gin 开发订单服务',
            evidence_ids: ['ev_1'],
            verification_status: 'supported',
          },
        ],
      },
    ],
    project_experiences: [],
    missing_requirements: [],
    review: {
      unsupported_claims: [],
      needs_user_confirmation: [],
      passed: true,
    },
  },
};

describe('ExperienceCustomizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.createExperienceGeneration.mockResolvedValue({
      run_id: 'run_1',
      status: 'pending',
    });
    api.getAgentRun.mockResolvedValue({
      run_id: 'run_1',
      status: 'completed',
      steps: [],
    });
    api.getAgentRunResult.mockResolvedValue(generation);
    api.updateExperienceGeneration.mockResolvedValue(generation);
    api.listExperienceGenerations.mockResolvedValue([
      generation,
      {
        id: 'gen_0',
        versionNo: 0,
        status: 'edited',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  test('没有已核实经历时引导用户先建立经历库', () => {
    const onOpenLibrary = jest.fn();
    render(
      <ExperienceCustomizer
        jobData={jobData}
        analysisResult={analysisResult}
        library={{ experiences: [] }}
        onOpenLibrary={onOpenLibrary}
      />
    );
    expect(screen.getByText(/需要先建立职业经历库/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('去经历库上传/补充经历'));
    expect(onOpenLibrary).toHaveBeenCalled();
  });

  test('展示进度、原始描述对比，并支持编辑后保存', async () => {
    render(
      <ExperienceCustomizer
        jobData={jobData}
        analysisResult={analysisResult}
        library={library}
        onOpenLibrary={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('开始生成'));

    await waitFor(() => {
      expect(screen.getByText('岗位匹配概览')).toBeInTheDocument();
    });
    expect(screen.getByText('使用 Go 和 Gin 开发订单服务')).toBeInTheDocument();
    expect(screen.getByText(/版本 v1/)).toBeInTheDocument();
    expect(screen.queryByText('草稿')).not.toBeInTheDocument();

    const editor = screen.getByDisplayValue('使用 Go、Gin 开发订单服务');
    fireEvent.change(editor, {
      target: { value: '使用 Go、Gin 开发订单服务，负责接口实现' },
    });
    fireEvent.click(screen.getByText('保存修改'));

    await waitFor(() => {
      expect(api.updateExperienceGeneration).toHaveBeenCalledWith(
        'gen_1',
        expect.objectContaining({
          work_experiences: [
            expect.objectContaining({
              bullets: [
                expect.objectContaining({
                  text: '使用 Go、Gin 开发订单服务，负责接口实现',
                }),
              ],
            }),
          ],
        })
      );
    });

    fireEvent.click(screen.getByText('历史版本'));
    await waitFor(() => {
      expect(api.listExperienceGenerations).toHaveBeenCalledWith('job_1');
    });
    expect(screen.getByText(/v0 · 已修改/)).toBeInTheDocument();
  });

  test('每段经历提供整段重新生成入口并调用接口', async () => {
    window.prompt = jest.fn(() => '突出性能');
    api.getAgentRunResult.mockResolvedValueOnce({
      ...generation,
      resultJson: {
        ...generation.resultJson,
        project_experiences: [
          {
            source_experience_id: 'prj_1',
            project_name: '订单平台',
            role: '核心开发',
            start_date: '2024.01',
            end_date: '2024.06',
            tech_stack: ['Go'],
            bullets: [
              {
                claim_id: 'claim_p1',
                text: '开发订单平台',
                original_text: '开发订单平台',
                evidence_ids: ['ev_p1'],
                verification_status: 'supported',
              },
            ],
          },
        ],
      },
    });
    api.regenerateExperience.mockResolvedValue({
      generation,
      experience: { source_experience_id: 'exp_1' },
    });
    render(
      <ExperienceCustomizer
        jobData={jobData}
        analysisResult={analysisResult}
        library={library}
        onOpenLibrary={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('开始生成'));
    await waitFor(() => {
      expect(screen.getByText('岗位匹配概览')).toBeInTheDocument();
    });

    const buttons = screen.getAllByText('重新生成整段');
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    await waitFor(() => {
      expect(api.regenerateExperience).toHaveBeenCalledWith({
        generationId: 'gen_1',
        sourceExperienceId: 'exp_1',
        userFeedback: '突出性能',
      });
    });
  });

  test('岗位定制页展示项目建议生成入口', () => {
    render(
      <ExperienceCustomizer
        jobData={jobData}
        analysisResult={analysisResult}
        library={library}
        onOpenLibrary={jest.fn()}
        onLibraryChange={jest.fn()}
      />
    );
    expect(screen.getByText('项目建议')).toBeInTheDocument();
    expect(screen.getByText('生成项目建议')).toBeInTheDocument();
  });
});
