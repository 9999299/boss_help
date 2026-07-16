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
});
