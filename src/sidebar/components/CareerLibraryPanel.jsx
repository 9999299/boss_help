import React, { useRef, useState } from 'react'; // eslint-disable-line no-unused-vars
import {
  confirmExperience,
  createExperience,
  hasConfirmedExperience,
  libraryStats,
  mergeImportedExperiences,
  normalizeCareerLibrary,
  removeExperience,
  replaceExperience,
  updateExperience,
} from '../../utils/careerLibrary';
import {
  ExperienceApiError,
  parseResume,
  parseResumeText,
} from '../../utils/experienceApi';

const splitList = (value) =>
  String(value || '')
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const EvidenceBadge = ({ confirmed }) => (
  <span className={`evidence-state ${confirmed ? 'confirmed' : 'pending'}`}>
    {confirmed ? '已核实' : '待核实'}
  </span>
);

const CareerLibraryPanel = ({ library, onChange }) => {
  const normalized = normalizeCareerLibrary(library);
  const stats = libraryStats(normalized);
  const fileRef = useRef(null);
  const [importText, setImportText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = (next) => {
    setError('');
    onChange(normalizeCareerLibrary(next));
  };

  const patch = (id, changes) => {
    update(updateExperience(normalized, id, changes));
  };

  const patchData = (id, data) => {
    const item = normalized.experiences.find((entry) => entry.id === id);
    if (!item) return;
    update(
      replaceExperience(
        normalized,
        normalizeCareerLibrary({
          experiences: [
            {
              ...item,
              data: { ...item.data, ...data },
              userConfirmed: false,
            },
          ],
        }).experiences[0]
      )
    );
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const data = await parseResume(file);
      const merged = mergeImportedExperiences(
        normalized,
        data.experiences || []
      );
      update(merged);
      setMessage(
        `已导入 ${data.experiences?.length || 0} 段经历，请逐项检查并勾选“我已核实”。`
      );
    } catch (importError) {
      setError(
        importError instanceof ExperienceApiError
          ? importError.message
          : importError.message || '简历解析失败'
      );
    } finally {
      setImporting(false);
    }
  };

  const handleParseText = async () => {
    if (importText.trim().length < 30) {
      setError('请粘贴至少 30 个字符的简历文本');
      return;
    }
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const data = await parseResumeText(importText);
      update(mergeImportedExperiences(normalized, data.experiences || []));
      setImportText('');
      setShowPaste(false);
      setMessage(
        `已解析 ${data.experiences?.length || 0} 段经历，请逐项检查并勾选“我已核实”。`
      );
    } catch (importError) {
      setError(importError.message || '简历解析失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="career-library">
      <div className="section">
        <h3>职业经历库</h3>
        <p className="hint">
          AI 只会使用这里已核实的真实经历。修改任意内容后需要重新核实。
        </p>
        <div className="library-stats">
          <span>工作 {stats.employment}</span>
          <span>项目 {stats.project}</span>
          <span>已核实 {stats.confirmed}</span>
        </div>
        {!hasConfirmedExperience(normalized) && (
          <div className="warning-message" role="alert">
            还没有已核实的工作或项目经历，暂时不能生成岗位定制经历。
          </div>
        )}
        <div className="import-actions">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleImportFile}
            hidden
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={importing}
            onClick={() => fileRef.current?.click()}
          >
            {importing ? '解析中...' : '上传简历 PDF/DOCX'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={importing}
            onClick={() => setShowPaste((value) => !value)}
          >
            粘贴简历文本
          </button>
        </div>
        {showPaste && (
          <div className="paste-resume">
            <textarea
              rows={6}
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="粘贴完整简历文本，AI 会提取工作和项目经历草稿..."
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={importing}
              onClick={handleParseText}
            >
              {importing ? '解析中...' : '解析文本'}
            </button>
          </div>
        )}
        {message && <p className="success-message">{message}</p>}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="section">
        <h4>工作经历</h4>
        {normalized.experiences.filter((item) => item.kind === 'employment')
          .length === 0 && <p className="hint">暂无工作经历。</p>}
        {normalized.experiences
          .filter((item) => item.kind === 'employment')
          .map((item) => (
            <div className="evidence-item experience-item" key={item.id}>
              <EvidenceBadge confirmed={item.userConfirmed} />
              <input
                type="text"
                placeholder="公司名称"
                value={item.organization}
                onChange={(event) =>
                  patch(item.id, { organization: event.target.value })
                }
              />
              <input
                type="text"
                placeholder="职位"
                value={item.title}
                onChange={(event) =>
                  patch(item.id, { title: event.target.value })
                }
              />
              <div className="inline-fields">
                <input
                  type="text"
                  placeholder="开始时间（如 2021.03）"
                  value={item.startDate}
                  onChange={(event) =>
                    patch(item.id, { startDate: event.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="结束时间（如 2023.06 / 至今）"
                  value={item.endDate}
                  onChange={(event) =>
                    patch(item.id, { endDate: event.target.value })
                  }
                />
              </div>
              <input
                type="text"
                placeholder="工作地点"
                value={item.data.location}
                onChange={(event) =>
                  patchData(item.id, { location: event.target.value })
                }
              />
              <textarea
                rows={3}
                placeholder="工作描述"
                value={item.data.description}
                onChange={(event) =>
                  patchData(item.id, { description: event.target.value })
                }
              />
              <textarea
                rows={3}
                placeholder="主要职责（每行一条，AI 只能引用这里的事实）"
                value={item.data.responsibilities.join('\n')}
                onChange={(event) =>
                  patchData(item.id, {
                    responsibilities: splitList(event.target.value),
                  })
                }
              />
              <textarea
                rows={2}
                placeholder="工作成果（每行一条，只写真实数据）"
                value={item.data.achievements.join('\n')}
                onChange={(event) =>
                  patchData(item.id, {
                    achievements: splitList(event.target.value),
                  })
                }
              />
              <label className="confirm-row">
                <input
                  type="checkbox"
                  checked={item.userConfirmed}
                  onChange={(event) =>
                    update(
                      confirmExperience(
                        normalized,
                        item.id,
                        event.target.checked
                      )
                    )
                  }
                />
                我已核实以上内容真实
              </label>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => update(removeExperience(normalized, item.id))}
              >
                删除
              </button>
            </div>
          ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            update({
              ...normalized,
              experiences: [
                ...normalized.experiences,
                createExperience('employment'),
              ],
            })
          }
        >
          添加工作经历
        </button>
      </div>

      <div className="section">
        <h4>项目经历</h4>
        {normalized.experiences.filter((item) => item.kind === 'project')
          .length === 0 && <p className="hint">暂无项目经历。</p>}
        {normalized.experiences
          .filter((item) => item.kind === 'project')
          .map((item) => (
            <div className="evidence-item project-item" key={item.id}>
              <EvidenceBadge confirmed={item.userConfirmed} />
              <input
                type="text"
                placeholder="项目名称"
                value={item.data.name || item.organization}
                onChange={(event) =>
                  patch(item.id, {
                    organization: event.target.value,
                    data: { name: event.target.value },
                  })
                }
              />
              <input
                type="text"
                placeholder="项目角色"
                value={item.data.role || item.title}
                onChange={(event) =>
                  patchData(item.id, { role: event.target.value })
                }
              />
              <div className="inline-fields">
                <input
                  type="text"
                  placeholder="开始时间"
                  value={item.startDate}
                  onChange={(event) =>
                    patch(item.id, { startDate: event.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="结束时间"
                  value={item.endDate}
                  onChange={(event) =>
                    patch(item.id, { endDate: event.target.value })
                  }
                />
              </div>
              <input
                type="text"
                placeholder="技术栈（逗号分隔）"
                value={item.data.techStack.join(', ')}
                onChange={(event) =>
                  patchData(item.id, {
                    techStack: splitList(event.target.value),
                  })
                }
              />
              <textarea
                rows={3}
                placeholder="项目描述"
                value={item.data.description}
                onChange={(event) =>
                  patchData(item.id, { description: event.target.value })
                }
              />
              <textarea
                rows={3}
                placeholder="项目职责（每行一条）"
                value={item.data.responsibilities.join('\n')}
                onChange={(event) =>
                  patchData(item.id, {
                    responsibilities: splitList(event.target.value),
                  })
                }
              />
              <textarea
                rows={2}
                placeholder="项目成果（每行一条，只写真实数据）"
                value={item.data.achievements.join('\n')}
                onChange={(event) =>
                  patchData(item.id, {
                    achievements: splitList(event.target.value),
                  })
                }
              />
              <label className="confirm-row">
                <input
                  type="checkbox"
                  checked={item.userConfirmed}
                  onChange={(event) =>
                    update(
                      confirmExperience(
                        normalized,
                        item.id,
                        event.target.checked
                      )
                    )
                  }
                />
                我已核实以上内容真实
              </label>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => update(removeExperience(normalized, item.id))}
              >
                删除
              </button>
            </div>
          ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            update({
              ...normalized,
              experiences: [
                ...normalized.experiences,
                createExperience('project'),
              ],
            })
          }
        >
          添加项目经历
        </button>
      </div>

      <div className="section">
        <h4>补充技能（可选）</h4>
        <p className="hint">
          技能只用于匹配岗位要求，不会自动变成工作经历。每行填写一个技能。
        </p>
        {normalized.experiences
          .filter((item) => item.kind === 'skill')
          .map((item) => (
            <div className="evidence-item skill-item" key={item.id}>
              <input
                type="text"
                placeholder="技能名称"
                value={item.organization}
                onChange={(event) =>
                  patch(item.id, { organization: event.target.value })
                }
              />
              <input
                type="text"
                placeholder="掌握程度（如 熟练 / 了解）"
                value={item.data.level}
                onChange={(event) =>
                  patchData(item.id, { level: event.target.value })
                }
              />
              <label className="confirm-row">
                <input
                  type="checkbox"
                  checked={item.userConfirmed}
                  onChange={(event) =>
                    update(
                      confirmExperience(
                        normalized,
                        item.id,
                        event.target.checked
                      )
                    )
                  }
                />
                我已掌握
              </label>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => update(removeExperience(normalized, item.id))}
              >
                删除
              </button>
            </div>
          ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            update({
              ...normalized,
              experiences: [
                ...normalized.experiences,
                createExperience('skill'),
              ],
            })
          }
        >
          添加技能
        </button>
      </div>
    </div>
  );
};

export default CareerLibraryPanel;
