require('@testing-library/jest-dom');
const {
  render,
  screen,
  fireEvent,
  waitFor,
} = require('@testing-library/react');
const JobAnalyzer = require('../sidebar/components/JobAnalyzer').default;

describe('JobAnalyzer 页面提取', () => {
  beforeEach(() => {
    global.alert = jest.fn();
    global.chrome = {
      tabs: {
        query: jest.fn().mockResolvedValue([
          {
            id: 7,
            url: 'https://www.zhipin.com/job_detail/example',
            title: '示例科技招聘后端工程师',
          },
        ]),
      },
      scripting: {
        executeScript: jest.fn().mockResolvedValue([
          {
            result: {
              jobDescription: '负责 Java 微服务开发',
              skills: ['Java'],
              experience: '3年以上经验',
              companyHints: ['示例科技'],
            },
          },
        ]),
      },
    };
  });

  test('显示页面内容会发送到 AI 服务的提示', () => {
    render(<JobAnalyzer onAnalyze={jest.fn()} isLoading={false} />);
    expect(screen.getByText(/页面文字将发送给 AI 服务/)).toBeInTheDocument();
  });

  test('提取页面元数据和公司提示并随分析请求提交', async () => {
    const onAnalyze = jest.fn();
    render(<JobAnalyzer onAnalyze={onAnalyze} isLoading={false} />);

    fireEvent.click(screen.getByRole('button', { name: '从页面提取' }));
    await waitFor(() => {
      expect(
        screen.getByDisplayValue('负责 Java 微服务开发')
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '分析职位' }));

    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({
        pageUrl: 'https://www.zhipin.com/job_detail/example',
        pageTitle: '示例科技招聘后端工程师',
        companyHints: ['示例科技'],
      })
    );
  });

  test('允许手动填写 BOSS 相关岗位公司作为候选来源', () => {
    const onAnalyze = jest.fn();
    render(<JobAnalyzer onAnalyze={onAnalyze} isLoading={false} />);

    fireEvent.change(screen.getByPlaceholderText('粘贴职位描述...'), {
      target: { value: '后端工程师' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/可粘贴 BOSS 相关岗位公司名/),
      { target: { value: '甲公司, 乙公司' } }
    );
    fireEvent.click(screen.getByRole('button', { name: '分析职位' }));

    expect(onAnalyze).toHaveBeenCalledWith(
      expect.objectContaining({ companyHints: ['甲公司', '乙公司'] })
    );
  });
});
