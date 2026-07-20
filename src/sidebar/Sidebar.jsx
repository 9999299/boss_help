import React, { useState, useEffect } from 'react'; // eslint-disable-line no-unused-vars
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
    const projects = (analysis.projects || []).map((p) => ({
      name: p.name || '',
      role: p.role || '',
      dates: p.dates || '',
      techStack: Array.isArray(p.techStack) ? p.techStack : [],
      description: p.description || '',
    }));

    const skills = [
      ...new Set([
        ...(analysis.extractedSkills || []),
        ...(analysis.skillMatch?.matched || []),
        ...(jobData.skills || []),
      ]),
    ];

    return {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        summary: `寻求${analysis.position}职位，具备${jobData.experience}经验。熟悉${skills.slice(0, 6).join('、') || '相关技术'}。`,
      },
      skills,
      experience: [],
      projects,
      education: [],
    };
  };

  const handleSaveResume = async (data) => {
    try {
      await saveResume(data);
      setResumeData(data);
      alert('简历已保存');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败: ' + error.message);
    }
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
          <h4>岗位分析结果</h4>

          <div className="analysis-section">
            <h5>基本信息</h5>
            <p><strong>职位：</strong>{analysisResult.position || '-'}</p>
            {analysisResult.company && <p><strong>公司：</strong>{analysisResult.company}</p>}
            {analysisResult.department && <p><strong>部门：</strong>{analysisResult.department}</p>}
            {analysisResult.salaryRange && <p><strong>薪资：</strong>{analysisResult.salaryRange}</p>}
          </div>

          {analysisResult.jobHighlights?.length > 0 && (
            <div className="analysis-section">
              <h5>岗位亮点</h5>
              <ul>{analysisResult.jobHighlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
            </div>
          )}

          {analysisResult.coreRequirements?.length > 0 && (
            <div className="analysis-section">
              <h5>核心要求</h5>
              <ul>{analysisResult.coreRequirements.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}

          {analysisResult.keyResponsibilities?.length > 0 && (
            <div className="analysis-section">
              <h5>主要职责</h5>
              <ul>{analysisResult.keyResponsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}

          {analysisResult.skillMatch && (
            <div className="analysis-section">
              <h5>技能匹配</h5>
              {analysisResult.skillMatch.matched?.length > 0 && (
                <p><strong>已匹配：</strong>{analysisResult.skillMatch.matched.join('、')}</p>
              )}
              {analysisResult.skillMatch.missing?.length > 0 && (
                <p><strong>缺失：</strong>{analysisResult.skillMatch.missing.join('、')}</p>
              )}
              {analysisResult.skillMatch.suggestions?.length > 0 && (
                <div>
                  <strong>提升建议：</strong>
                  <ul>{analysisResult.skillMatch.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {analysisResult.resumeTips?.length > 0 && (
            <div className="analysis-section">
              <h5>简历优化建议</h5>
              <ul>{analysisResult.resumeTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}

          {analysisResult.interviewPrep?.length > 0 && (
            <div className="analysis-section">
              <h5>面试准备</h5>
              <ul>{analysisResult.interviewPrep.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          )}

          {analysisResult.careerAdvice && (
            <div className="analysis-section">
              <h5>职业发展</h5>
              {analysisResult.careerAdvice.growthPath && <p><strong>晋升路径：</strong>{analysisResult.careerAdvice.growthPath}</p>}
              {analysisResult.careerAdvice.industryTrend && <p><strong>行业趋势：</strong>{analysisResult.careerAdvice.industryTrend}</p>}
              {analysisResult.careerAdvice.transferableSkills?.length > 0 && (
                <p><strong>可迁移技能：</strong>{analysisResult.careerAdvice.transferableSkills.join('、')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
