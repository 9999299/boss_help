import { useState, useEffect } from 'react';
import JobAnalyzer from './components/JobAnalyzer';
import ResumeEditor from './components/ResumeEditor';
import ExportPanel from './components/ExportPanel';
import { analyzeJob, saveResume, loadResume } from '../utils/api';
import '../styles/sidebar.css';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('analyzer');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadResume().then((data) => {
      if (data) {
        setResumeData(data);
      }
    });
  }, []);

  const handleAnalyze = async (jobData) => {
    setIsLoading(true);
    try {
      const result = await analyzeJob(jobData);
      setAnalysisResult(result);

      const draftResume = generateResumeDraft(result, jobData);
      setResumeData(draftResume);

      setActiveTab('editor');
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const generateResumeDraft = (analysis, jobData) => {
    return {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        summary: `寻求${analysis.position}职位，具备${jobData.experience}经验。`,
      },
      skills: [
        ...(analysis.skillMatch?.matched || []),
        ...(jobData.skills || []),
      ],
      experience: [],
      education: [],
    };
  };

  const handleSaveResume = async (data) => {
    await saveResume(data);
    setResumeData(data);
    alert('简历已保存');
  };

  return (
    <div className="sidebar-container">
      <div className="header">
        <h1>AI Resume Generator</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'analyzer' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyzer')}
        >
          职位分析
        </button>
        <button
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          简历编辑
        </button>
        <button
          className={`tab ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          导出
        </button>
      </div>

      <div className="content">
        {activeTab === 'analyzer' && (
          <JobAnalyzer onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}

        {activeTab === 'editor' && (
          <ResumeEditor initialData={resumeData} onSave={handleSaveResume} />
        )}

        {activeTab === 'export' && <ExportPanel resumeData={resumeData} />}
      </div>

      {analysisResult && (
        <div className="analysis-result">
          <h4>分析结果</h4>
          <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
