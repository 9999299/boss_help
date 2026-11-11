require('@testing-library/jest-dom');
const { render, screen } = require('@testing-library/react');

jest.mock('../utils/exportResume', () => ({
  exportResumePdf: jest.fn(),
  exportResumeDocx: jest.fn(),
}));

const ExportPanel = require('../sidebar/components/ExportPanel').default;

test('Word 导出按钮可用', () => {
  render(
    <ExportPanel
      resumeData={{
        personalInfo: { name: '张三' },
        companyCandidates: [{ company: '示例科技' }],
        strengths: [{ title: '执行力' }],
      }}
    />
  );

  const button = screen.getByRole('button', { name: '导出为Word' });
  expect(button).toBeEnabled();
});
