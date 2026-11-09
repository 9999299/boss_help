require('@testing-library/jest-dom');
const {
  fireEvent,
  render,
  screen,
  waitFor,
} = require('@testing-library/react');
const ExampleProjectsSection =
  require('../sidebar/components/ExampleProjectsSection').default;
const experienceApi = require('../utils/experienceApi');
const careerLibrary = require('../utils/careerLibrary');

jest.mock('../utils/experienceApi', () => ({
  generateExampleProjects: jest.fn(),
}));

jest.mock('../utils/careerLibrary', () => ({
  ...jest.requireActual('../utils/careerLibrary'),
  createExperience: jest.fn(),
}));

const jobData = {
  jobDescription: '招聘 AI 后端工程师，要求 Go、RAG、Kubernetes。',
  skills: ['Go', 'RAG', 'Kubernetes'],
};

const analysisResult = {
  position: 'AI 后端工程师',
  coreRequirements: ['Go', 'RAG', 'Kubernetes'],
};

describe('ExampleProjectsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    experienceApi.generateExampleProjects.mockResolvedValue({
      projects: [
        {
          id: 'exm_1',
          name: 'RAG 知识库服务',
          role: '核心开发',
          techStack: ['RAG'],
          description: '搭建检索增强问答服务',
          responsibilities: ['实现检索与重排'],
          achievements: [],
          coveredRequirements: ['RAG'],
          source: 'model',
          evidenceStatus: 'example',
          userConfirmed: false,
        },
      ],
      missing_requirements: [{ requirement: 'RAG' }],
    });
    careerLibrary.createExperience.mockImplementation((kind, changes) => ({
      id: 'prj_new',
      kind,
      ...changes,
    }));
  });

  test('按缺口生成示例项目并展示示例标记', async () => {
    render(
      <ExampleProjectsSection
        jobData={jobData}
        analysisResult={analysisResult}
        library={{ experiences: [] }}
      />
    );

    fireEvent.click(screen.getByText('生成示例项目'));

    await waitFor(() => {
      expect(screen.getByText('RAG 知识库服务')).toBeInTheDocument();
    });
    expect(experienceApi.generateExampleProjects).toHaveBeenCalledWith(
      expect.objectContaining({ jobData, analysisResult })
    );
    expect(screen.getByText('示例')).toBeInTheDocument();
    expect(screen.getByText('待核实')).toBeInTheDocument();
  });

  test('加入经历库时使用未核实的示例草稿', async () => {
    const onChange = jest.fn();
    render(
      <ExampleProjectsSection
        jobData={jobData}
        analysisResult={analysisResult}
        library={{ experiences: [] }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText('生成示例项目'));
    await waitFor(() => {
      expect(screen.getByText('RAG 知识库服务')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('加入经历库'));

    expect(careerLibrary.createExperience).toHaveBeenCalledWith(
      'project',
      expect.objectContaining({
        source: 'model',
        userConfirmed: false,
        data: expect.objectContaining({ name: 'RAG 知识库服务' }),
      })
    );
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        experiences: expect.arrayContaining([
          expect.objectContaining({ id: 'prj_new', userConfirmed: false }),
        ]),
      })
    );
  });

  test('生成失败时展示错误信息', async () => {
    experienceApi.generateExampleProjects.mockRejectedValue(
      new Error('AI 服务响应超时，请重试')
    );
    render(
      <ExampleProjectsSection
        jobData={jobData}
        analysisResult={analysisResult}
        library={{ experiences: [] }}
      />
    );

    fireEvent.click(screen.getByText('生成示例项目'));
    await waitFor(() => {
      expect(screen.getByText('AI 服务响应超时，请重试')).toBeInTheDocument();
    });
  });
});
