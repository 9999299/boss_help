import React, { useEffect, useState } from 'react'; // eslint-disable-line no-unused-vars
import {
  normalizeCompanyCandidate,
  normalizeExperience,
  normalizeExperienceSummary,
  normalizeProject,
  normalizeResume,
  normalizeStrength,
  updateEvidenceItem,
} from '../../utils/resumeSchema';

const splitList = (value) =>
  String(value || '')
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const EvidenceState = ({ item }) => (
  <span
    className={`evidence-state ${item.userConfirmed ? 'confirmed' : 'pending'}`}
  >
    {item.userConfirmed ? '已核实' : '待核实'}
  </span>
);

const ResumeEditor = ({ initialData, onSave }) => {
  const [resumeData, setResumeData] = useState(() => normalizeResume());

  useEffect(() => {
    setResumeData(normalizeResume(initialData || {}));
  }, [initialData]);

  const handlePersonalInfoChange = (field, value) => {
    setResumeData((current) => ({
      ...current,
      personalInfo: { ...current.personalInfo, [field]: value },
    }));
  };

  const updateSummary = (changes) => {
    setResumeData((current) => ({
      ...current,
      experienceSummary: normalizeExperienceSummary(
        updateEvidenceItem(current.experienceSummary, changes),
        current.experienceSummary?.source
      ),
    }));
  };

  const updateItem = (collection, index, changes, normalizer) => {
    setResumeData((current) => {
      const items = [...(current[collection] || [])];
      items[index] = normalizer(
        updateEvidenceItem(items[index], changes),
        items[index]?.source
      );
      return { ...current, [collection]: items };
    });
  };

  const removeItem = (collection, index) => {
    setResumeData((current) => ({
      ...current,
      [collection]: (current[collection] || []).filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const addItem = (collection, item) => {
    setResumeData((current) => ({
      ...current,
      [collection]: [...(current[collection] || []), item],
    }));
  };

  const handleSave = () => onSave(normalizeResume(resumeData));

  return (
    <div className="resume-editor">
      <h3>简历编辑器</h3>

      <div className="section">
        <h4>个人信息</h4>
        <input
          type="text"
          placeholder="姓名"
          value={resumeData.personalInfo.name}
          onChange={(e) => handlePersonalInfoChange('name', e.target.value)}
        />
        <input
          type="email"
          placeholder="邮箱"
          value={resumeData.personalInfo.email}
          onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
        />
        <input
          type="tel"
          placeholder="电话"
          value={resumeData.personalInfo.phone}
          onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
        />
        <textarea
          placeholder="个人简介"
          value={resumeData.personalInfo.summary}
          onChange={(e) => handlePersonalInfoChange('summary', e.target.value)}
          rows={4}
        />
      </div>

      <div className="section">
        <h4>工作年限（AI 草稿，请按实际核实）</h4>
        <div className="evidence-item summary-item">
          <EvidenceState item={resumeData.experienceSummary} />
          <input
            type="text"
            placeholder="总工作年限（如 5年）"
            value={resumeData.experienceSummary.totalYears}
            onChange={(e) => updateSummary({ totalYears: e.target.value })}
          />
          <input
            type="text"
            placeholder="相关行业经验年限（如 3年）"
            value={resumeData.experienceSummary.industryYears}
            onChange={(e) => updateSummary({ industryYears: e.target.value })}
          />
          <input
            type="text"
            placeholder="所属行业（如 互联网 / 企业服务）"
            value={resumeData.experienceSummary.industry}
            onChange={(e) => updateSummary({ industry: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={resumeData.experienceSummary.userConfirmed}
              onChange={(e) =>
                updateSummary({ userConfirmed: e.target.checked })
              }
            />
            我已按实际情况核实
          </label>
        </div>
      </div>

      <div className="section">
        <h4>技能</h4>
        <div className="skills-list">
          {resumeData.skills.map((skill, index) => (
            <span key={`${skill}-${index}`} className="skill-tag">
              {skill}
              <button
                type="button"
                aria-label={`删除技能 ${skill}`}
                onClick={() =>
                  setResumeData((current) => ({
                    ...current,
                    skills: current.skills.filter((_, i) => i !== index),
                  }))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="添加技能（回车确认）"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const skill = e.currentTarget.value.trim();
              if (skill && !resumeData.skills.includes(skill)) {
                setResumeData((current) => ({
                  ...current,
                  skills: [...current.skills, skill],
                }));
                e.currentTarget.value = '';
              }
            }
          }}
        />
      </div>

      <div className="section">
        <h4>工作经历（AI 草稿，请按实际修改；按时间倒序）</h4>
        {(resumeData.experience || []).length === 0 && (
          <p className="hint">暂无工作经历，可以添加草稿或先完成职位分析。</p>
        )}
        {(resumeData.experience || []).map((entry, index) => (
          <div
            key={`experience-${index}`}
            className="evidence-item experience-item"
          >
            <EvidenceState item={entry} />
            <input
              type="text"
              placeholder="公司名称"
              value={entry.company}
              onChange={(e) =>
                updateItem(
                  'experience',
                  index,
                  { company: e.target.value },
                  normalizeExperience
                )
              }
            />
            <input
              type="text"
              placeholder="职位"
              value={entry.title}
              onChange={(e) =>
                updateItem(
                  'experience',
                  index,
                  { title: e.target.value },
                  normalizeExperience
                )
              }
            />
            <input
              type="text"
              placeholder="在职时间段（如 2021.03 - 2023.06）"
              value={entry.dates}
              onChange={(e) =>
                updateItem(
                  'experience',
                  index,
                  { dates: e.target.value },
                  normalizeExperience
                )
              }
            />
            <input
              type="text"
              placeholder="工作地点"
              value={entry.location}
              onChange={(e) =>
                updateItem(
                  'experience',
                  index,
                  { location: e.target.value },
                  normalizeExperience
                )
              }
            />
            <textarea
              placeholder="工作描述"
              value={entry.description}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'experience',
                  index,
                  { description: e.target.value },
                  normalizeExperience
                )
              }
            />
            <textarea
              placeholder="主要职责（每行一条）"
              value={entry.responsibilities.join('\n')}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'experience',
                  index,
                  { responsibilities: splitList(e.target.value) },
                  normalizeExperience
                )
              }
            />
            <textarea
              placeholder="工作成果（每行一条）"
              value={entry.achievements.join('\n')}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'experience',
                  index,
                  { achievements: splitList(e.target.value) },
                  normalizeExperience
                )
              }
            />
            <label>
              <input
                type="checkbox"
                checked={entry.userConfirmed}
                onChange={(e) =>
                  updateItem(
                    'experience',
                    index,
                    { userConfirmed: e.target.checked },
                    normalizeExperience
                  )
                }
              />
              我已按实际情况核实
            </label>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeItem('experience', index)}
            >
              删除工作经历
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            addItem(
              'experience',
              normalizeExperience({ source: 'user' }, 'user')
            )
          }
        >
          添加工作经历
        </button>
      </div>

      <div className="section">
        <h4>项目经历（示例项目，请按实际修改）</h4>
        {(resumeData.projects || []).length === 0 && (
          <p className="hint">暂无项目，可以添加草稿或先完成职位分析。</p>
        )}
        {(resumeData.projects || []).map((project, index) => (
          <div key={`project-${index}`} className="evidence-item project-item">
            <EvidenceState item={project} />
            <input
              type="text"
              placeholder="项目名称"
              value={project.name}
              onChange={(e) =>
                updateItem(
                  'projects',
                  index,
                  { name: e.target.value },
                  normalizeProject
                )
              }
            />
            <input
              type="text"
              placeholder="角色"
              value={project.role}
              onChange={(e) =>
                updateItem(
                  'projects',
                  index,
                  { role: e.target.value },
                  normalizeProject
                )
              }
            />
            <input
              type="text"
              placeholder="时间"
              value={project.dates}
              onChange={(e) =>
                updateItem(
                  'projects',
                  index,
                  { dates: e.target.value },
                  normalizeProject
                )
              }
            />
            <input
              type="text"
              placeholder="技术栈（逗号分隔）"
              value={project.techStack.join(', ')}
              onChange={(e) =>
                updateItem(
                  'projects',
                  index,
                  { techStack: splitList(e.target.value) },
                  normalizeProject
                )
              }
            />
            <textarea
              placeholder="项目描述"
              value={project.description}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'projects',
                  index,
                  { description: e.target.value },
                  normalizeProject
                )
              }
            />
            <textarea
              placeholder="项目成果（每行一条）"
              value={project.achievements.join('\n')}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'projects',
                  index,
                  { achievements: splitList(e.target.value) },
                  normalizeProject
                )
              }
            />
            <label>
              <input
                type="checkbox"
                checked={project.userConfirmed}
                onChange={(e) =>
                  updateItem(
                    'projects',
                    index,
                    { userConfirmed: e.target.checked },
                    normalizeProject
                  )
                }
              />
              我已按实际情况核实
            </label>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeItem('projects', index)}
            >
              删除项目
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            addItem('projects', normalizeProject({ source: 'user' }, 'user'))
          }
        >
          添加项目
        </button>
      </div>

      <div className="section">
        <h4>候选公司经历（待核实，不代表真实任职）</h4>
        {(resumeData.companyCandidates || []).length === 0 && (
          <p className="hint">暂无候选公司，分析岗位后可自动生成。</p>
        )}
        {(resumeData.companyCandidates || []).map((candidate, index) => (
          <div key={`company-${index}`} className="evidence-item company-item">
            <EvidenceState item={candidate} />
            <input
              type="text"
              placeholder="候选公司"
              value={candidate.company}
              onChange={(e) =>
                updateItem(
                  'companyCandidates',
                  index,
                  { company: e.target.value },
                  normalizeCompanyCandidate
                )
              }
            />
            <input
              type="text"
              placeholder="岗位方向"
              value={candidate.role}
              onChange={(e) =>
                updateItem(
                  'companyCandidates',
                  index,
                  { role: e.target.value },
                  normalizeCompanyCandidate
                )
              }
            />
            <input
              type="text"
              placeholder="行业"
              value={candidate.industry}
              onChange={(e) =>
                updateItem(
                  'companyCandidates',
                  index,
                  { industry: e.target.value },
                  normalizeCompanyCandidate
                )
              }
            />
            <input
              type="text"
              placeholder="地点"
              value={candidate.location}
              onChange={(e) =>
                updateItem(
                  'companyCandidates',
                  index,
                  { location: e.target.value },
                  normalizeCompanyCandidate
                )
              }
            />
            <textarea
              placeholder="匹配理由"
              value={candidate.matchReason}
              rows={2}
              onChange={(e) =>
                updateItem(
                  'companyCandidates',
                  index,
                  { matchReason: e.target.value },
                  normalizeCompanyCandidate
                )
              }
            />
            <textarea
              placeholder="建议职责（每行一条）"
              value={candidate.suggestedResponsibilities.join('\n')}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'companyCandidates',
                  index,
                  { suggestedResponsibilities: splitList(e.target.value) },
                  normalizeCompanyCandidate
                )
              }
            />
            <label>
              <input
                type="checkbox"
                checked={candidate.userConfirmed}
                onChange={(e) =>
                  updateItem(
                    'companyCandidates',
                    index,
                    { userConfirmed: e.target.checked },
                    normalizeCompanyCandidate
                  )
                }
              />
              我已按实际情况核实
            </label>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeItem('companyCandidates', index)}
            >
              删除候选公司
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            addItem(
              'companyCandidates',
              normalizeCompanyCandidate({ source: 'user' }, 'user')
            )
          }
        >
          添加候选公司
        </button>
      </div>

      <div className="section">
        <h4>个人优势（AI 草稿，请用事实支撑）</h4>
        {(resumeData.strengths || []).length === 0 && (
          <p className="hint">暂无个人优势，分析岗位后可自动生成。</p>
        )}
        {(resumeData.strengths || []).map((strength, index) => (
          <div
            key={`strength-${index}`}
            className="evidence-item strength-item"
          >
            <EvidenceState item={strength} />
            <input
              type="text"
              placeholder="优势标题"
              value={strength.title}
              onChange={(e) =>
                updateItem(
                  'strengths',
                  index,
                  { title: e.target.value },
                  normalizeStrength
                )
              }
            />
            <textarea
              placeholder="优势描述"
              value={strength.description}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'strengths',
                  index,
                  { description: e.target.value },
                  normalizeStrength
                )
              }
            />
            <input
              type="text"
              placeholder="关键词（逗号分隔）"
              value={strength.keywords.join(', ')}
              onChange={(e) =>
                updateItem(
                  'strengths',
                  index,
                  { keywords: splitList(e.target.value) },
                  normalizeStrength
                )
              }
            />
            <textarea
              placeholder="证据建议（每行一条）"
              value={strength.evidenceSuggestions.join('\n')}
              rows={3}
              onChange={(e) =>
                updateItem(
                  'strengths',
                  index,
                  { evidenceSuggestions: splitList(e.target.value) },
                  normalizeStrength
                )
              }
            />
            <label>
              <input
                type="checkbox"
                checked={strength.userConfirmed}
                onChange={(e) =>
                  updateItem(
                    'strengths',
                    index,
                    { userConfirmed: e.target.checked },
                    normalizeStrength
                  )
                }
              />
              我已按实际情况核实
            </label>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeItem('strengths', index)}
            >
              删除个人优势
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            addItem('strengths', normalizeStrength({ source: 'user' }, 'user'))
          }
        >
          添加个人优势
        </button>
      </div>

      <button type="button" className="btn btn-primary" onClick={handleSave}>
        保存简历
      </button>
    </div>
  );
};

export default ResumeEditor;
