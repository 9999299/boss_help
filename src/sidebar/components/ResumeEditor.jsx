import React, { useState, useEffect } from 'react'; // eslint-disable-line no-unused-vars

const ResumeEditor = ({ initialData, onSave }) => {
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      summary: '',
    },
    skills: [],
    experience: [],
    projects: [],
    education: [],
  });

  useEffect(() => {
    if (initialData) {
      setResumeData(initialData);
    }
  }, [initialData]);

  const handlePersonalInfoChange = (field, value) => {
    setResumeData({
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        [field]: value,
      },
    });
  };

  const handleSave = () => {
    onSave(resumeData);
  };

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
        <h4>技能</h4>
        <div className="skills-list">
          {resumeData.skills.map((skill, index) => (
            <span key={index} className="skill-tag">
              {skill}
              <button
                onClick={() => {
                  const newSkills = resumeData.skills.filter(
                    (_, i) => i !== index
                  );
                  setResumeData({ ...resumeData, skills: newSkills });
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="添加技能（回车确认）"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const newSkill = e.target.value.trim();
              if (newSkill && !resumeData.skills.includes(newSkill)) {
                setResumeData({
                  ...resumeData,
                  skills: [...resumeData.skills, newSkill],
                });
                e.target.value = '';
              }
            }
          }}
        />
      </div>

      <div className="section">
        <h4>项目经历（AI 生成，请按实际修改）</h4>
        {(resumeData.projects || []).length === 0 ? (
          <p className="hint">暂无项目，请先完成职位分析</p>
        ) : (
          (resumeData.projects || []).map((project, index) => (
            <div key={index} className="project-item">
              <input
                type="text"
                placeholder="项目名称"
                value={project.name || ''}
                onChange={(e) => {
                  const projects = [...(resumeData.projects || [])];
                  projects[index] = { ...projects[index], name: e.target.value };
                  setResumeData({ ...resumeData, projects });
                }}
              />
              <input
                type="text"
                placeholder="角色"
                value={project.role || ''}
                onChange={(e) => {
                  const projects = [...(resumeData.projects || [])];
                  projects[index] = { ...projects[index], role: e.target.value };
                  setResumeData({ ...resumeData, projects });
                }}
              />
              <input
                type="text"
                placeholder="时间"
                value={project.dates || ''}
                onChange={(e) => {
                  const projects = [...(resumeData.projects || [])];
                  projects[index] = { ...projects[index], dates: e.target.value };
                  setResumeData({ ...resumeData, projects });
                }}
              />
              <input
                type="text"
                placeholder="技术栈（逗号分隔）"
                value={(project.techStack || []).join(', ')}
                onChange={(e) => {
                  const projects = [...(resumeData.projects || [])];
                  projects[index] = {
                    ...projects[index],
                    techStack: e.target.value
                      .split(/[,，]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  };
                  setResumeData({ ...resumeData, projects });
                }}
              />
              <textarea
                placeholder="项目描述"
                value={project.description || ''}
                rows={3}
                onChange={(e) => {
                  const projects = [...(resumeData.projects || [])];
                  projects[index] = {
                    ...projects[index],
                    description: e.target.value,
                  };
                  setResumeData({ ...resumeData, projects });
                }}
              />
            </div>
          ))
        )}
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        保存简历
      </button>
    </div>
  );
};

export default ResumeEditor;
