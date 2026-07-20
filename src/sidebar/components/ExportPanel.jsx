import React from 'react'; // eslint-disable-line no-unused-vars
import { buildResumeHtml } from '../../utils/resumeHtml';

const ExportPanel = ({ resumeData }) => {
  const hasResumeContent = (data) => {
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
        (data.education && data.education.length)
    );
  };

  const exportAsJSON = () => {
    const dataStr = JSON.stringify(resumeData, null, 2);
    const dataUri =
      'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'resume.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const exportAsPDF = () => {
    if (!hasResumeContent(resumeData)) {
      alert('请先在编辑器中填写简历信息。');
      return;
    }

    try {
      const html = buildResumeHtml(resumeData);
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('请允许弹窗后重试');
        return;
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
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败: ' + error.message);
    }
  };

  const exportAsWord = async () => {
    alert('Word导出功能开发中...');
  };

  return (
    <div className="export-panel">
      <h3>导出简历</h3>

      <div className="export-options">
        <button className="btn btn-primary" onClick={exportAsJSON}>
          导出为JSON
        </button>

        <button className="btn btn-secondary" onClick={exportAsPDF}>
          导出为PDF
        </button>

        <button className="btn btn-secondary" onClick={exportAsWord}>
          导出为Word
        </button>
      </div>

      <div className="export-preview">
        <h4>预览</h4>
        {resumeData ? (
          <pre>{JSON.stringify(resumeData, null, 2)}</pre>
        ) : (
          <p>暂无简历数据，请先在编辑器中填写简历信息。</p>
        )}
      </div>
    </div>
  );
};

export default ExportPanel;
