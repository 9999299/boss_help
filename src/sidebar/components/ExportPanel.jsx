const ExportPanel = ({ resumeData }) => {
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

  const exportAsPDF = async () => {
    alert('PDF导出功能开发中...');
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
