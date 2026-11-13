import React, { useState, useEffect, useRef } from 'react'; // eslint-disable-line no-unused-vars
import JobAnalyzer from './components/JobAnalyzer';
import ResumeEditor from './components/ResumeEditor';
import ExportPanel from './components/ExportPanel';
import CareerLibraryPanel from './components/CareerLibraryPanel';
import ExperienceCustomizer from './components/ExperienceCustomizer';
import { analyzeJob, saveResume, loadResume } from '../utils/api';
import { loadCareerLibrary, saveCareerLibrary } from '../utils/careerLibrary';
import { normalizeResume } from '../utils/resumeSchema';
import '../styles/sidebar.css';

const TAB_ITEMS = [
  {
    id: 'analyzer',
    label: '职位分析',
    icon: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
  },
  {
    id: 'library',
    label: '经历库',
    icon: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M4 5.5v16" />
      </>
    ),
  },
  {
    id: 'customize',
    label: '岗位定制',
    icon: (
      <>
        <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
        <path d="m18 15 .9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" />
      </>
    ),
  },
  {
    id: 'editor',
    label: '简历编辑',
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h4" />
      </>
    ),
  },
  {
    id: 'export',
    label: '导出',
    icon: (
      <>
        <path d="M12 3v11" />
        <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
        <path d="M4 17v3h16v-3" />
      </>
    ),
  },
];

const Sidebar = () => {
  const [activeTab, setActiveTab] = useState('analyzer');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [jobData, setJobData] = useState(null);
  const [careerLibrary, setCareerLibrary] = useState(null);
  const [customizeRunKey, setCustomizeRunKey] = useState('');
  const [editorNotice, setEditorNotice] = useState(false);
  const noticeTimer = useRef(null);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    if (!editorNotice) return;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [editorNotice]);

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
      education: [],
    });
  };

  const handleConfirmGenerate = () => {
    if (!analysisResult) return;
    setResumeData(generateResumeDraft(analysisResult, jobData || {}));
    setActiveTab('editor');
    setEditorNotice(true);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setEditorNotice(false), 2200);
  };

  const handleSaveResume = async (data) => {
    await saveResume(data);
    setResumeData(data);
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
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            B
          </div>
          <div className="brand-text">
            <h1>boss_help</h1>
            <p>AI 求职助手</p>
          </div>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="功能导航">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <svg
              className="tab-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              {tab.icon}
            </svg>
            <span>{tab.label}</span>
          </button>
        ))}
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
          <div className="editor-transition">
            {editorNotice && (
              <div className="editor-notice" role="status">
                已生成简历
              </div>
            )}
            <ResumeEditor
              initialData={resumeData}
              jobAnalysis={analysisResult}
              onSave={handleSaveResume}
            />
          </div>
        )}

        {activeTab === 'export' && <ExportPanel resumeData={resumeData} />}
      </div>

      {analysisResult && activeTab === 'analyzer' && (
        <div className="analysis-result">
          <h4>岗位分析结果</h4>

          <div className="analysis-section analysis-overview">
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
                <span className="info-chip">{analysisResult.salaryRange}</span>
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
                <h5>工作年限</h5>
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

          {analysisResult.projects?.length > 0 && (
            <div className="analysis-section">
              <h5>项目经历</h5>
              <ul>
                {analysisResult.projects.map((project, i) => (
                  <li key={i}>
                    <strong>{project.name || '未命名项目'}</strong>
                    {project.role ? ` · ${project.role}` : ''}
                    {project.dates ? `（${project.dates}）` : ''}
                    {project.description && <p>{project.description}</p>}
                    {project.responsibilities?.length > 0 && (
                      <ul>
                        {project.responsibilities.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {project.achievements?.length > 0 && (
                      <ul>
                        {project.achievements.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.experience?.length > 0 && (
            <div className="analysis-section">
              <h5>工作经历</h5>
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

          <div className="analysis-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmGenerate}
            >
              确认生成
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
