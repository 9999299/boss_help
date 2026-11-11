/* global Blob */
import {
  hasResumeContent,
  exportResumePdf,
  exportResumeDocx,
} from '../utils/exportResume';

jest.mock('../utils/resumeDocx', () => ({
  buildResumeDocxBlob: jest.fn(() =>
    Promise.resolve(
      new Blob(['docx'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
    )
  ),
}));

const sample = {
  personalInfo: { name: '张三', email: 'a@b.com', phone: '138' },
  skills: ['Java'],
  experience: [],
  projects: [],
  education: [],
};

function fakePrintWindow() {
  return {
    document: {
      open: jest.fn(),
      write: jest.fn(),
      close: jest.fn(),
      readyState: 'complete',
    },
    focus: jest.fn(),
    print: jest.fn(),
    close: jest.fn(),
    onafterprint: null,
  };
}

test('hasResumeContent 判断是否有内容', () => {
  expect(hasResumeContent(null)).toBe(false);
  expect(hasResumeContent({ personalInfo: {} })).toBe(false);
  expect(hasResumeContent(sample)).toBe(true);
});

test('PDF 导出写入 HTML 并调用打印', () => {
  const printWindow = fakePrintWindow();
  const alert = jest.fn();
  const open = jest.fn(() => printWindow);

  const ok = exportResumePdf(sample, { window: { open }, alert });

  expect(ok).toBe(true);
  expect(open).toHaveBeenCalledWith('', '_blank');
  expect(printWindow.document.write).toHaveBeenCalledWith(
    expect.stringContaining('张三')
  );
  expect(printWindow.print).toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});

test('PDF 弹窗被拦截时提示', () => {
  const alert = jest.fn();
  const ok = exportResumePdf(sample, {
    window: { open: jest.fn(() => null) },
    alert,
  });

  expect(ok).toBe(false);
  expect(alert).toHaveBeenCalledWith('请允许弹窗后重试');
});

test('空内容时不导出并提示', () => {
  const alert = jest.fn();
  const ok = exportResumePdf({}, { window: { open: jest.fn() }, alert });

  expect(ok).toBe(false);
  expect(alert).toHaveBeenCalledWith('请先在编辑器中填写简历信息。');
});

test('Word 导出下载 .docx 文件', async () => {
  const click = jest.fn();
  const remove = jest.fn();
  const link = { href: '', download: '', click, remove };
  const doc = {
    createElement: jest.fn(() => link),
    body: { appendChild: jest.fn() },
  };
  const alert = jest.fn();
  const createObjectURL = jest.fn(() => 'blob:mock');

  const ok = await exportResumeDocx(sample, {
    document: doc,
    alert,
    createObjectURL,
  });

  expect(ok).toBe(true);
  expect(createObjectURL).toHaveBeenCalled();
  expect(link.href).toBe('blob:mock');
  expect(link.download).toBe('简历-张三.docx');
  expect(click).toHaveBeenCalled();
  expect(remove).toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
});
