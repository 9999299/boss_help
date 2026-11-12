import React, { useState } from 'react'; // eslint-disable-line no-unused-vars
import { createExperience } from '../../utils/careerLibrary';
import { generateExampleProjects } from '../../utils/experienceApi';

function splitDates(dates) {
  const text = String(dates || '').trim();
  if (!text) return { startDate: '', endDate: '' };
  const parts = text.split(/\s*(?:-|–|—|~|至)\s*/).filter(Boolean);
  if (parts.length >= 2) return { startDate: parts[0], endDate: parts[1] };
  return { startDate: text, endDate: '' };
}

function projectKey(project, index) {
  return project?.id || `${project?.name || 'example'}_${index}`;
}

const ExampleProjectsSection = ({
  jobData,
  analysisResult,
  library,
  onChange,
}) => {
  const [projects, setProjects] = useState([]);
  const [missingRequirements, setMissingRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState([]);

  if (!jobData?.jobDescription) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setAdded([]);
    try {
      const data = await generateExampleProjects({
        jobData,
        analysisResult,
        library,
      });
      setProjects(Array.isArray(data?.projects) ? data.projects : []);
      setMissingRequirements(
        Array.isArray(data?.missing_requirements)
          ? data.missing_requirements
          : []
      );
    } catch (generateError) {
      setError(generateError.message || '生成项目建议失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (project, index) => {
    const dates = splitDates(project.dates);
    const experience = createExperience('project', {
      source: 'model',
      userConfirmed: false,
      title: project.name || '',
      ...dates,
      data: {
        name: project.name || '',
        role: project.role || '',
        description: project.description || '',
        responsibilities: project.responsibilities || [],
        achievements: project.achievements || [],
        techStack: project.techStack || [],
      },
    });
    const base =
      library && Array.isArray(library.experiences)
        ? library
        : { experiences: [] };
    if (onChange) {
      onChange({
        ...base,
        experiences: [...base.experiences, experience],
      });
    }
    setAdded((current) => [...current, projectKey(project, index)]);
  };

  return (
    <div className="example-projects">
      <div className="example-projects-header">
        <h4>项目建议</h4>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={loading}
          onClick={handleGenerate}
        >
          {loading
            ? '正在生成项目建议...'
            : projects.length
              ? '重新生成项目建议'
              : '生成项目建议'}
        </button>
      </div>
      <p className="hint">根据岗位缺口生成项目建议，可编辑后加入经历库。</p>

      {missingRequirements.length > 0 && (
        <div className="gap-chips">
          <span>岗位缺口：</span>
          {missingRequirements.map((item, index) => (
            <span className="gap-chip" key={`${item.requirement}_${index}`}>
              {item.requirement}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      {projects.map((project, index) => {
        const key = projectKey(project, index);
        const isAdded = added.includes(key);
        return (
          <div className="example-project-card" key={key}>
            <div className="example-project-title">
              <strong>{project.name}</strong>
            </div>
            <p className="example-project-meta">
              {[project.role, project.dates].filter(Boolean).join(' · ')}
            </p>
            {project.techStack?.length > 0 && (
              <p className="example-project-tech">
                {project.techStack.join(' / ')}
              </p>
            )}
            {project.description && <p>{project.description}</p>}
            {project.responsibilities?.length > 0 && (
              <ul>
                {project.responsibilities.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )}
            {project.coveredRequirements?.length > 0 && (
              <p className="example-project-covered">
                覆盖要求：{project.coveredRequirements.join('、')}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={isAdded}
              onClick={() => handleAdd(project, index)}
            >
              {isAdded ? '已加入经历库' : '加入经历库'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ExampleProjectsSection;
