import React, { useState, useEffect } from 'react'; // eslint-disable-line no-unused-vars
import JobAnalyzer from './components/JobAnalyzer';
import ResumeEditor from './components/ResumeEditor';
import ExportPanel from './components/ExportPanel';
import CareerLibraryPanel from './components/CareerLibraryPanel';
import ExperienceCustomizer from './components/ExperienceCustomizer';
import { analyzeJob, saveResume, loadResume } from '../utils/api';
import { loadCareerLibrary, saveCareerLibrary } from '../utils/careerLibrary';
import { normalizeResume } from '../utils/resumeSchema';
import '../styles/sidebar.css';

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('analyzer');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [jobData, setJobData] = useState(null);
  const [careerLibrary, setCareerLibrary] = useState(null);
  const [customizeRunKey, setCustomizeRunKey] = useState('');

  useEffect(() => {
    loadResume().then((data) => {
      if (data) {
        setResumeData(data);
      }
    });
    loadCareerLibrary()
      .then((data) => setCareerLibrary(data))
      .catch((error) => console.error('经历库加载失败:', error));
  }, []);

  const handleAnalyze = async (nextJobData) => {
    setIsLoading(true);
    setAnalysisError('');
    setJobData(nextJobData);
    try {
      const result = await analyzeJob(nextJobData);
      setAnalysisResult(result);

      const draftResume = generateResumeDraft(result, nextJobData);
      setResumeData(draftResume);

      setActiveTab('editor');
    } catch (error) {
      console.error('分析失败:', error);
      setAnalysisError(error.message || '分析失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const generateResumeDraft = (analysis, nextJobData) => {
    const skills = [
      ...new Set([
        ...(analysis.extractedSkills || []),
        ...(analysis.skillMatch?.matched || []),
        ...(nextJobData.skills || []),
      ]),
    ];

    return normalizeResume({
      schemaVersion: 2,
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        summary: `寻求${analysis.position}职位，具备${nextJobData.experience}经验。熟悉${skills.slice(0, 6).join('、') || '相关技术'}。`,
      },
      skills,
      experienceSummary: analysis.experienceSummary || {},
      experience: analysis.experience || [],
      projects: analysis.projects || [],
      companyCandidates: analysis.companyCandidates || [],
      strengths: analysis.strengths || [],
      education: [],
    });
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

  const handleCareerLibraryChange = (next) => {
    setCareerLibrary(next);
    saveCareerLibrary(next).catch((error) =>
      console.error('经历库保存失败:', error)
    );
  };

  const handleOpenCustomizer = () => {
    setCustomizeRunKey(String(Date.now()));
    setActiveTab('customize');
  };

  const handleSearchSimilar = (result) => {
    const skills = result.extractedSkills || result.skillMatch?.matched || [];
    const position = result.position || '';
    // 构造 BOSS 直聘搜索关键词：职位 + 核心技能
    const query = [position, ...skills.slice(0, 3)].filter(Boolean).join(' ');
    const url = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
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
          className={`tab ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          经历库
        </button>
        <button
          className={`tab ${activeTab === 'customize' ? 'active' : ''}`}
          onClick={() => setActiveTab('customize')}
        >
          岗位定制
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

      {analysisError && (
        <div className="error-message" role="alert">
          分析失败：{analysisError}。请检查网络或稍后重试。
        </div>
      )}

      <div className="content">
        {activeTab === 'analyzer' && (
          <JobAnalyzer onAnalyze={handleAnalyze} isLoading={isLoading} />
        )}

        {activeTab === 'library' && (
          <CareerLibraryPanel
            library={careerLibrary}
            onChange={handleCareerLibraryChange}
          />
        )}

        {activeTab === 'customize' && (
          <ExperienceCustomizer
            jobData={jobData}
            analysisResult={analysisResult}
            library={careerLibrary}
            autoRunKey={customizeRunKey}
            onOpenLibrary={() => setActiveTab('library')}
            onLibraryChange={handleCareerLibraryChange}
          />
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
            <p>
              <strong>职位：</strong>
              {analysisResult.position || '-'}
            </p>
            {analysisResult.company && (
              <p>
                <strong>公司：</strong>
                {analysisResult.company}
              </p>
            )}
            {analysisResult.department && (
              <p>
                <strong>部门：</strong>
                {analysisResult.department}
              </p>
            )}
            {analysisResult.salaryRange && (
              <p>
                <strong>薪资：</strong>
                {analysisResult.salaryRange}
              </p>
            )}
            <div className="analysis-actions">
              <button
                className="btn btn-primary btn-customize-experience"
                onClick={handleOpenCustomizer}
                disabled={!jobData}
              >
                AI 定制工作经历
              </button>
              <button
                className="btn btn-secondary btn-search-similar"
                onClick={() => handleSearchSimilar(analysisResult)}
              >
                查找类似岗位
              </button>
            </div>
          </div>

          {analysisResult.experienceSummary &&
            (analysisResult.experienceSummary.totalYears ||
              analysisResult.experienceSummary.industryYears) && (
              <div className="analysis-section">
                <h5>工作年限（待核实）</h5>
                {analysisResult.experienceSummary.totalYears && (
                  <p>
                    <strong>总工作年限：</strong>
                    {analysisResult.experienceSummary.totalYears}
                  </p>
                )}
                {analysisResult.experienceSummary.industryYears && (
                  <p>
                    <strong>相关行业经验：</strong>
                    {analysisResult.experienceSummary.industryYears}
                    {analysisResult.experienceSummary.industry
                      ? ` · ${analysisResult.experienceSummary.industry}`
                      : ''}
                  </p>
                )}
              </div>
            )}

          {analysisResult.jobHighlights?.length > 0 && (
            <div className="analysis-section">
              <h5>岗位亮点</h5>
              <ul>
                {analysisResult.jobHighlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.coreRequirements?.length > 0 && (
            <div className="analysis-section">
              <h5>核心要求</h5>
              <ul>
                {analysisResult.coreRequirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.keyResponsibilities?.length > 0 && (
            <div className="analysis-section">
              <h5>主要职责</h5>
              <ul>
                {analysisResult.keyResponsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.skillMatch && (
            <div className="analysis-section">
              <h5>技能匹配</h5>
              {analysisResult.skillMatch.matched?.length > 0 && (
                <p>
                  <strong>已匹配：</strong>
                  {analysisResult.skillMatch.matched.join('、')}
                </p>
              )}
              {analysisResult.skillMatch.missing?.length > 0 && (
                <p>
                  <strong>缺失：</strong>
                  {analysisResult.skillMatch.missing.join('、')}
                </p>
              )}
              {analysisResult.skillMatch.suggestions?.length > 0 && (
                <div>
                  <strong>提升建议：</strong>
                  <ul>
                    {analysisResult.skillMatch.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {analysisResult.resumeTips?.length > 0 && (
            <div className="analysis-section">
              <h5>简历优化建议</h5>
              <ul>
                {analysisResult.resumeTips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.interviewPrep?.length > 0 && (
            <div className="analysis-section">
              <h5>面试准备</h5>
              <ul>
                {analysisResult.interviewPrep.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.experience?.length > 0 && (
            <div className="analysis-section">
              <h5>工作经历草稿（待核实，请按实际修改）</h5>
              <ul>
                {analysisResult.experience.map((exp, i) => (
                  <li key={i}>
                    <strong>{exp.company || '未命名公司'}</strong>
                    {exp.title ? ` · ${exp.title}` : ''}
                    {exp.dates ? `（${exp.dates}）` : ''}
                    {exp.responsibilities?.length > 0 && (
                      <ul>
                        {exp.responsibilities.map((responsibility, j) => (
                          <li key={j}>{responsibility}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.companyCandidates?.length > 0 && (
            <div className="analysis-section">
              <h5>候选公司（待核实，不代表真实任职）</h5>
              <ul>
                {analysisResult.companyCandidates.map((candidate, i) => (
                  <li key={i}>
                    <strong>{candidate.company || '未命名公司'}</strong>
                    {candidate.role ? ` · ${candidate.role}` : ''}
                    {candidate.matchReason ? `：${candidate.matchReason}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.strengths?.length > 0 && (
            <div className="analysis-section">
              <h5>个人优势草稿（请用事实核实）</h5>
              <ul>
                {analysisResult.strengths.map((strength, i) => (
                  <li key={i}>
                    <strong>{strength.title || '未命名优势'}</strong>
                    {strength.description ? `：${strength.description}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.careerAdvice && (
            <div className="analysis-section">
              <h5>职业发展</h5>
              {analysisResult.careerAdvice.growthPath && (
                <p>
                  <strong>晋升路径：</strong>
                  {analysisResult.careerAdvice.growthPath}
                </p>
              )}
              {analysisResult.careerAdvice.industryTrend && (
                <p>
                  <strong>行业趋势：</strong>
                  {analysisResult.careerAdvice.industryTrend}
                </p>
              )}
              {analysisResult.careerAdvice.transferableSkills?.length > 0 && (
                <p>
                  <strong>可迁移技能：</strong>
                  {analysisResult.careerAdvice.transferableSkills.join('、')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
