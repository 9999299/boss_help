require('@testing-library/jest-dom');
const {
  render,
  screen,
  fireEvent,
  waitFor,
} = require('@testing-library/react');
const Sidebar = require('../sidebar/Sidebar').default;

// Mock chrome API
global.chrome = {
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1 }]),
    sendMessage: jest.fn().mockResolvedValue({
      content: { jobDescription: 'test', skills: [], experience: '' },
    }),
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn((keys, cb) => cb({})),
      set: jest.fn((data, cb) => cb && cb()),
    },
  },
};

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () =>
    Promise.resolve({ position: 'test', skillMatch: { matched: [] } }),
});

// Mock alert
global.alert = jest.fn();

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('渲染侧边栏标题', () => {
    render(<Sidebar />);
    expect(screen.getByText('AI Resume Generator')).toBeInTheDocument();
  });

  test('显示三个标签页', () => {
    render(<Sidebar />);
    expect(screen.getAllByText('职位分析').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole('button', { name: '简历编辑' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出' })).toBeInTheDocument();
  });

  test('默认显示职位分析标签', () => {
    render(<Sidebar />);
    expect(screen.getByText('从页面提取')).toBeInTheDocument();
  });

  test('点击简历编辑标签切换内容', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: '简历编辑' }));
    expect(screen.getByText('简历编辑器')).toBeInTheDocument();
  });

  test('点击导出标签切换内容', () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: '导出' }));
    expect(screen.getByText('导出简历')).toBeInTheDocument();
  });

  test('职位分析表单提交触发分析', async () => {
    render(<Sidebar />);

    const textarea = screen.getByPlaceholderText('粘贴职位描述...');
    fireEvent.change(textarea, { target: { value: '前端开发工程师' } });

    const submitButton = screen.getByText('分析职位');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  test('加载已保存的简历', async () => {
    const savedResume = {
      personalInfo: {
        name: '张三',
        email: 'test@test.com',
        phone: '123',
        summary: 'test',
      },
      skills: ['React'],
    };

    chrome.storage.local.get.mockImplementation((keys, cb) => {
      cb({ resume: savedResume });
    });

    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: '简历编辑' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('张三')).toBeInTheDocument();
    });
  });

  test('分析后把项目、候选公司和个人优势带入编辑器', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        position: '后端工程师',
        skillMatch: { matched: ['Java'] },
        projects: [{ name: '订单平台', achievements: ['吞吐量提升'] }],
        companyCandidates: [
          { company: '示例科技', role: '后端工程师', source: 'page' },
        ],
        strengths: [{ title: '系统设计能力', description: '能拆解复杂系统' }],
      }),
    });
    render(<Sidebar />);

    fireEvent.change(screen.getByPlaceholderText('粘贴职位描述...'), {
      target: { value: '负责 Java 微服务' },
    });
    fireEvent.click(screen.getByRole('button', { name: '分析职位' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('订单平台')).toBeInTheDocument();
      expect(screen.getByDisplayValue('示例科技')).toBeInTheDocument();
      expect(screen.getByDisplayValue('系统设计能力')).toBeInTheDocument();
    });
  });

  test('分析后把工作经历和工作年限带入编辑器', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        position: '后端工程师',
        skillMatch: { matched: ['Java'] },
        experience: [
          {
            company: '某互联网公司',
            title: '后端工程师',
            dates: '2021.03 - 2023.06',
            responsibilities: ['负责核心服务'],
          },
        ],
        experienceSummary: { totalYears: '5年', industryYears: '3年' },
      }),
    });
    render(<Sidebar />);

    fireEvent.change(screen.getByPlaceholderText('粘贴职位描述...'), {
      target: { value: '负责 Java 微服务' },
    });
    fireEvent.click(screen.getByRole('button', { name: '分析职位' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('某互联网公司')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5年')).toBeInTheDocument();
      expect(screen.getByDisplayValue('负责核心服务')).toBeInTheDocument();
    });
  });

  test('后端失败时显示可重试错误而不生成假简历', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: 'AI service failed' }),
    });
    render(<Sidebar />);

    fireEvent.change(screen.getByPlaceholderText('粘贴职位描述...'), {
      target: { value: '测试岗位' },
    });
    fireEvent.click(screen.getByRole('button', { name: '分析职位' }));

    expect(await screen.findByText(/AI service failed/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '分析职位' })
    ).toBeInTheDocument();
  });
});
