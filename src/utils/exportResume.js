import { buildResumeHtml } from './resumeHtml.js';
import { buildResumeDocxBlob } from './resumeDocx.js';

export function hasResumeContent(data) {
  if (!data) return false;
  const info = data.personalInfo || {};
  return Boolean(
    info.name ||
      info.summary ||
      info.email ||
      info.phone ||
      (data.skills && data.skills.length) ||
      (data.experience && data.experience.length) ||
      (data.projects && data.projects.length) ||
      (data.companyCandidates && data.companyCandidates.length) ||
      (data.strengths && data.strengths.length) ||
      (data.education && data.education.length)
  );
}

function resumeFileName(resumeData, extension) {
  const raw = String(resumeData?.personalInfo?.name || '').trim();
  const safe = raw.replace(/[\\/:*?"<>|]/g, '_') || '未命名';
  return `简历-${safe}.${extension}`;
}

function resolveAlert(alertFn) {
  if (typeof alertFn === 'function') return alertFn;
  if (typeof alert !== 'undefined') return alert;
  return () => {};
}

export function exportResumePdf(resumeData, options = {}) {
  const alertFn = resolveAlert(options.alert);
  const win =
    options.window || (typeof window !== 'undefined' ? window : undefined);

  if (!hasResumeContent(resumeData)) {
    alertFn('请先在编辑器中填写简历信息。');
    return false;
  }
  if (!win || typeof win.open !== 'function') {
    alertFn('当前环境不支持导出 PDF');
    return false;
  }

  try {
    const html = buildResumeHtml(resumeData);
    const printWindow = win.open('', '_blank');
    if (!printWindow) {
      alertFn('请允许弹窗后重试');
      return false;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const doPrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => {
        try {
          printWindow.close();
        } catch {
          /* ignore */
        }
      };
    };

    if (printWindow.document.readyState === 'complete') {
      doPrint();
    } else {
      printWindow.onload = doPrint;
    }
    return true;
  } catch (error) {
    console.error('PDF导出失败:', error);
    alertFn('PDF导出失败: ' + error.message);
    return false;
  }
}

export async function exportResumeDocx(resumeData, options = {}) {
  const alertFn = resolveAlert(options.alert);
  const doc =
    options.document || (typeof document !== 'undefined' ? document : undefined);

  if (!hasResumeContent(resumeData)) {
    alertFn('请先在编辑器中填写简历信息。');
    return false;
  }

  try {
    const blob = await buildResumeDocxBlob(resumeData);
    const createObjectURL =
      options.createObjectURL ||
      (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL.bind(URL)
        : null);

    if (!createObjectURL || !doc) {
      throw new Error('当前环境不支持文件下载');
    }

    const url = createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = resumeFileName(resumeData, 'docx');
    doc.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }, 0);

    return true;
  } catch (error) {
    console.error('Word导出失败:', error);
    alertFn('导出失败: ' + error.message);
    return false;
  }
}
