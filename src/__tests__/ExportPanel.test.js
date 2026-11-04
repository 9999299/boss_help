require('@testing-library/jest-dom');
const { render, screen } = require('@testing-library/react');
const ExportPanel = require('../sidebar/components/ExportPanel').default;

test('Word 导出尚未实现时明确显示不可用', () => {
  render(
    <ExportPanel
      resumeData={{
        personalInfo: { name: '张三' },
        companyCandidates: [{ company: '示例科技' }],
        strengths: [{ title: '执行力' }],
      }}
    />
  );

  const button = screen.getByRole('button', { name: /Word/ });
  expect(button).toBeDisabled();
  expect(screen.getByText(/暂未支持/)).toBeInTheDocument();
});
