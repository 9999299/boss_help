require('@testing-library/jest-dom');
const { render, screen, fireEvent } = require('@testing-library/react');

jest.mock('../utils/exportResume', () => ({
  exportResumePdf: jest.fn(),
  exportResumeDocx: jest.fn(),
}));

const { exportResumePdf, exportResumeDocx } = require('../utils/exportResume');
const ResumeEditor = require('../sidebar/components/ResumeEditor').default;

const resume = {
  schemaVersion: 2,
  personalInfo: { name: '', email: '', phone: '', summary: '' },
  skills: ['Java'],
  experience: [],
  education: [],
  projects: [
    {
      name: '订单平台',
      role: '核心开发',
      dates: '2025.01 - 2025.06',
      techStack: ['Java', 'Redis'],
      description: '负责订单服务',
      achievements: ['接口延迟降低 20%'],
      source: 'model',
      evidenceStatus: 'example',
      userConfirmed: false,
    },
  ],
  companyCandidates: [
    {
      company: '示例科技',
      industry: '企业服务',
      role: '后端工程师',
      location: '上海',
      matchReason: '技术栈匹配',
      suggestedResponsibilities: ['负责微服务开发'],
      source: 'page',
      evidenceStatus: 'candidate',
      userConfirmed: true,
    },
  ],
  strengths: [
    {
      title: '工程落地能力',
      description: '能独立交付服务',
      evidenceSuggestions: ['准备线上指标作为证据'],
      keywords: ['交付'],
      source: 'model',
      evidenceStatus: 'draft',
      userConfirmed: false,
    },
  ],
};

describe('ResumeEditor v2', () => {
  test('展示项目成果、候选公司和个人优势编辑区', () => {
    render(<ResumeEditor initialData={resume} onSave={jest.fn()} />);

    expect(screen.getByText(/项目经历/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('接口延迟降低 20%')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '公司经历' })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('示例科技')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /个人优势/ })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('工程落地能力')).toBeInTheDocument();
    expect(screen.queryByText('待核实')).not.toBeInTheDocument();
  });

  test('教育经历位于个人信息之后、工作年限之前', () => {
    render(<ResumeEditor initialData={resume} onSave={jest.fn()} />);
    const headings = screen
      .getAllByRole('heading', { level: 4 })
      .map((node) => node.textContent);
    expect(headings.indexOf('教育经历')).toBeGreaterThan(
      headings.indexOf('个人信息')
    );
    expect(headings.indexOf('教育经历')).toBeLessThan(
      headings.indexOf('工作年限')
    );
  });

  test('编辑候选公司后重置核实状态并保存完整结构', () => {
    const onSave = jest.fn();
    render(<ResumeEditor initialData={resume} onSave={onSave} />);

    fireEvent.change(screen.getByDisplayValue('示例科技'), {
      target: { value: '示例科技（已核实）' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.schemaVersion).toBe(2);
    expect(saved.companyCandidates[0]).toMatchObject({
      company: '示例科技（已核实）',
      userConfirmed: false,
      source: 'page',
    });
    expect(saved.projects[0].achievements).toEqual(['接口延迟降低 20%']);
    expect(saved.strengths[0].title).toBe('工程落地能力');
  });

  test('可新增项目草稿', () => {
    const onSave = jest.fn();
    render(
      <ResumeEditor
        initialData={{
          ...resume,
          projects: [],
          companyCandidates: [],
          strengths: [],
        }}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '添加项目' }));
    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.projects[0]).toMatchObject({
      source: 'user',
      userConfirmed: false,
    });
  });

  test('可添加并保存教育经历', () => {
    const onSave = jest.fn();
    render(
      <ResumeEditor
        initialData={{ ...resume, education: [] }}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '添加教育经历' }));
    fireEvent.change(screen.getByPlaceholderText('学校名称'), {
      target: { value: '某大学' },
    });
    fireEvent.change(screen.getByPlaceholderText('专业'), {
      target: { value: '计算机科学' },
    });
    fireEvent.change(screen.getByPlaceholderText('学历（如 本科、硕士）'), {
      target: { value: '本科' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('起止时间（如 2018.09 - 2022.06）'),
      { target: { value: '2016.09 - 2020.06' } }
    );
    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.education[0]).toMatchObject({
      school: '某大学',
      major: '计算机科学',
      degree: '本科',
      dates: '2016.09 - 2020.06',
    });
  });

  test('添加教育经历时嵌入所选学历模版', () => {
    const onSave = jest.fn();
    render(
      <ResumeEditor
        initialData={{ ...resume, education: [] }}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '添加教育经历' }));
    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));
    expect(onSave.mock.calls[0][0].education[0].degree).toBe('本科');

    fireEvent.change(screen.getByLabelText('学历模版'), {
      target: { value: '硕士' },
    });
    fireEvent.click(screen.getByRole('button', { name: '添加教育经历' }));
    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    expect(
      onSave.mock.calls[1][0].education.map((item) => item.degree)
    ).toEqual(['本科', '硕士']);
  });

  test('展示并编辑工作年限与工作经历，保存后保留职责与成果', () => {
    const onSave = jest.fn();
    render(
      <ResumeEditor
        initialData={{
          ...resume,
          experienceSummary: {
            totalYears: '5年',
            industryYears: '3年',
            industry: '互联网',
            source: 'model',
            evidenceStatus: 'draft',
            userConfirmed: false,
          },
          experience: [
            {
              company: '新公司',
              title: '高级工程师',
              dates: '2021.03 - 2023.06',
              location: '上海',
              description: '负责订单核心服务',
              responsibilities: ['负责核心服务'],
              achievements: ['QPS 提升 2 倍'],
              source: 'model',
              evidenceStatus: 'draft',
              userConfirmed: false,
            },
          ],
        }}
        onSave={onSave}
      />
    );

    expect(screen.getByDisplayValue('5年')).toBeInTheDocument();
    expect(screen.getByDisplayValue('新公司')).toBeInTheDocument();
    expect(screen.getByDisplayValue('负责核心服务')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('新公司'), {
      target: { value: '新公司（已核实）' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.experience[0]).toMatchObject({
      company: '新公司（已核实）',
      userConfirmed: false,
      responsibilities: ['负责核心服务'],
      achievements: ['QPS 提升 2 倍'],
    });
    expect(saved.experienceSummary.totalYears).toBe('5年');
  });

  test('可新增工作经历草稿', () => {
    const onSave = jest.fn();
    render(
      <ResumeEditor
        initialData={{ ...resume, experience: [] }}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '添加工作经历' }));
    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.experience[0]).toMatchObject({
      source: 'user',
      userConfirmed: false,
      responsibilities: [],
      achievements: [],
    });
  });

  test('保存成功后显示格式选择并可导出 PDF', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    render(<ResumeEditor initialData={resume} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    expect(
      await screen.findByText('已保存到本地，请选择导出格式')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '导出 PDF' }));
    expect(exportResumePdf).toHaveBeenCalledTimes(1);
  });

  test('保存成功后可选导出 Word', async () => {
    const onSave = jest.fn().mockResolvedValue(true);
    render(<ResumeEditor initialData={resume} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));
    await screen.findByText('已保存到本地，请选择导出格式');
    fireEvent.click(screen.getByRole('button', { name: '导出 Word' }));

    expect(exportResumeDocx).toHaveBeenCalledTimes(1);
  });

  test('保存失败时显示错误且不显示格式选择', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('存储不可用'));
    render(<ResumeEditor initialData={resume} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: '保存简历' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('存储不可用');
    expect(
      screen.queryByText('已保存到本地，请选择导出格式')
    ).not.toBeInTheDocument();
  });
});
