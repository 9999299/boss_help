import React, { useCallback, useEffect, useRef, useState } from 'react'; // eslint-disable-line no-unused-vars
import {
  hasConfirmedExperience,
  normalizeCareerLibrary,
} from '../../utils/careerLibrary';
import {
  cancelAgentRun,
  confirmExperienceGeneration,
  createExperienceGeneration,
  getAgentRun,
  getAgentRunResult,
  getExperienceGeneration,
  listExperienceGenerations,
  regenerateBullet,
  retryAgentRun,
  updateExperienceGeneration,
} from '../../utils/experienceApi';
import ExampleProjectsSection from './ExampleProjectsSection';

const DEFAULT_STEPS = [
  { key: 'jd_analysis', label: '正在分析岗位要求' },
  { key: 'experience_retrieval', label: '正在匹配个人经历' },
  { key: 'experience_planning', label: '正在制定经历优化方案' },
  { key: 'experience_writing', label: '正在生成工作经历' },
  { key: 'experience_review', label: '正在检查真实性' },
  { key: 'result_building', label: '已生成完成' },
];

const STATUS_TEXT = {
  pending: '等待开始',
  running: '生成中',
  completed: '已完成',
  failed: '生成失败',
  cancelled: '已取消',
  draft: '草稿',
  edited: '已修改',
  confirmed: '已确认',
};

function clone(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function stepIcon(status) {
  if (status === 'completed') return '✓';
  if (status === 'running') return '●';
  if (status === 'failed') return '!';
  return '○';
}

function copyText(result) {
  const lines = [];
  for (const experience of result?.work_experiences || []) {
    lines.push(
      `${experience.company || ''} | ${experience.position || ''} | ${
        experience.start_date || ''
      } - ${experience.end_date || ''}`
    );
    for (const bullet of experience.bullets || [])
      lines.push(`- ${bullet.text}`);
    lines.push('');
  }
  for (const project of result?.project_experiences || []) {
    lines.push(
      `${project.project_name || ''} | ${project.role || ''} | ${
        project.start_date || ''
      } - ${project.end_date || ''}`
    );
    for (const bullet of project.bullets || []) lines.push(`- ${bullet.text}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

const ExperienceCustomizer = ({
  jobData,
  analysisResult,
  library,
  autoRunKey,
  onOpenLibrary,
  onLibraryChange,
}) => {
  const normalizedLibrary = normalizeCareerLibrary(library);
  const canGenerate =
    Boolean(jobData?.jobDescription) &&
    hasConfirmedExperience(normalizedLibrary);
  const [runId, setRunId] = useState('');
  const [run, setRun] = useState(null);
  const [generation, setGeneration] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pollTick, setPollTick] = useState(0);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const lastAutoRun = useRef('');

  const loadResult = useCallback(async (id) => {
    const data = await getAgentRunResult(id);
    setGeneration(data);
  }, []);

  const startGeneration = useCallback(async () => {
    if (!canGenerate || starting) return;
    setStarting(true);
    setError('');
    setMessage('');
    setGeneration(null);
    setRun(null);
    setRunId('');
    setHistory([]);
    try {
      const data = await createExperienceGeneration({
        jobData,
        analysisResult,
        library: normalizedLibrary,
      });
      setRunId(data.run_id);
    } catch (startError) {
      setError(startError.message || '任务创建失败');
    } finally {
      setStarting(false);
    }
  }, [analysisResult, canGenerate, jobData, normalizedLibrary, starting]);

  useEffect(() => {
    if (!autoRunKey || autoRunKey === lastAutoRun.current) return;
    lastAutoRun.current = autoRunKey;
    startGeneration();
  }, [autoRunKey, startGeneration]);

  useEffect(() => {
    if (!runId) return undefined;
    let active = true;
    let timer;
    const poll = async () => {
      try {
        const data = await getAgentRun(runId);
        if (!active) return;
        setRun(data);
        if (data.status === 'completed') {
          await loadResult(runId);
          return;
        }
        if (data.status === 'failed') {
          setError(data.error?.message || '生成失败，请重试');
          return;
        }
        if (data.status === 'cancelled') return;
        timer = setTimeout(poll, 900);
      } catch (pollError) {
        if (!active) return;
        setError(pollError.message || '查询任务状态失败');
        if (pollError.status !== 401) timer = setTimeout(poll, 1500);
      }
    };
    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [loadResult, pollTick, runId]);

  const updateBullet = (section, experienceIndex, bulletIndex, text) => {
    if (generation?.status === 'confirmed') return;
    setGeneration((current) => {
      if (!current) return current;
      const next = clone(current);
      const bullet =
        next.resultJson[section][experienceIndex].bullets[bulletIndex];
      bullet.text = text;
      bullet.verification_status = 'user_edited';
      return next;
    });
    setMessage('');
  };

  const removeBullet = (section, experienceIndex, bulletIndex) => {
    if (generation?.status === 'confirmed') return;
    setGeneration((current) => {
      if (!current) return current;
      const next = clone(current);
      next.resultJson[section][experienceIndex].bullets.splice(bulletIndex, 1);
      return next;
    });
    setMessage('');
  };

  const handleRegenerate = async (bullet) => {
    if (!generation || generation.status === 'confirmed') return;
    const feedback =
      typeof window !== 'undefined' && typeof window.prompt === 'function'
        ? window.prompt('希望如何调整这条描述？', '语言更简洁，突出真实技术栈')
        : '';
    if (feedback === null) return;
    setError('');
    setMessage('');
    try {
      const data = await regenerateBullet({
        generationId: generation.id,
        claimId: bullet.claim_id,
        userFeedback: feedback,
      });
      setGeneration(data.generation);
      setMessage('单条描述已重新生成并通过真实性检查');
    } catch (regenerateError) {
      setError(regenerateError.message || '重新生成失败');
    }
  };

  const handleSave = async ({ confirm = false } = {}) => {
    if (!generation || generation.status === 'confirmed') return;
    setError('');
    setMessage('');
    try {
      const saved = await updateExperienceGeneration(
        generation.id,
        generation.resultJson
      );
      setGeneration(saved);
      if (confirm) {
        const confirmed = await confirmExperienceGeneration(generation.id);
        setGeneration(confirmed);
        setMessage('已确认并保存为当前岗位专属版本');
      } else {
        setMessage('修改已保存');
      }
    } catch (saveError) {
      setError(saveError.message || '保存失败');
    }
  };

  const loadHistory = async () => {
    if (!generation?.jobId) return;
    setHistoryLoading(true);
    setError('');
    try {
      const data = await listExperienceGenerations(generation.jobId);
      setHistory(data || []);
    } catch (historyError) {
      setError(historyError.message || '获取历史版本失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const openVersion = async (id) => {
    setError('');
    setMessage('');
    try {
      const data = await getExperienceGeneration(id);
      setGeneration(data);
      setRunId('');
      setRun(null);
    } catch (versionError) {
      setError(versionError.message || '读取历史版本失败');
    }
  };

  const handleCopy = async () => {
    if (!generation) return;
    try {
      await navigator.clipboard.writeText(copyText(generation.resultJson));
      setMessage('已复制全部内容');
    } catch {
      setError('复制失败，请手动选择文本');
    }
  };

  const handleRetry = async () => {
    if (!runId) return;
    setError('');
    try {
      const data = await retryAgentRun(runId);
      setRun((current) => ({ ...current, status: data.status }));
      setPollTick((value) => value + 1);
    } catch (retryError) {
      setError(retryError.message || '重试失败');
    }
  };

  const handleCancel = async () => {
    if (!runId) return;
    try {
      await cancelAgentRun(runId);
      setRun((current) => ({ ...current, status: 'cancelled' }));
    } catch (cancelError) {
      setError(cancelError.message || '取消失败');
    }
  };

  const steps = run?.steps?.length ? run.steps : DEFAULT_STEPS;
  const result = generation?.resultJson;
  const status = generation?.status || run?.status || 'pending';
  const locked = generation?.status === 'confirmed';

  if (!jobData?.jobDescription) {
    return (
      <div className="experience-customizer">
        <h3>AI 定制工作经历</h3>
        <p className="hint">请先在“职位分析”中提取或粘贴岗位 JD。</p>
      </div>
    );
  }

  if (!hasConfirmedExperience(normalizedLibrary)) {
    return (
      <div className="experience-customizer">
        <h3>AI 定制工作经历</h3>
        <div className="warning-message" role="alert">
          生成前需要先建立职业经历库，并核实至少一段真实工作或项目经历。
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenLibrary}
        >
          去经历库上传/补充经历
        </button>
      </div>
    );
  }

  return (
    <div className="experience-customizer">
      <div className="customizer-header">
        <h3>AI 定制工作经历</h3>
        <span className={`generation-status ${status}`}>
          {STATUS_TEXT[status] || status}
        </span>
        {generation?.versionNo && (
          <span className="version-badge">版本 v{generation.versionNo}</span>
        )}
      </div>
      <p className="hint">
        只会使用经历库中已核实的真实经历；未匹配的岗位要求会明确标记，不会自动补写。
      </p>

      <ExampleProjectsSection
        jobData={jobData}
        analysisResult={analysisResult}
        library={normalizedLibrary}
        onChange={onLibraryChange}
      />

      {!runId && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={starting}
          onClick={startGeneration}
        >
          {starting ? '正在创建任务...' : '开始生成'}
        </button>
      )}

      {runId && (
        <div className="agent-progress">
          <h4>执行进度</h4>
          <ol>
            {steps.map((step) => (
              <li key={step.key} className={`step ${step.status || 'pending'}`}>
                <span className="step-icon">{stepIcon(step.status)}</span>
                <span>{step.label}</span>
                {step.status === 'failed' && step.error?.message && (
                  <small>{step.error.message}</small>
                )}
              </li>
            ))}
          </ol>
          {run?.status === 'running' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              取消任务
            </button>
          )}
          {run?.status === 'failed' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRetry}
            >
              从失败步骤重试
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {message && <p className="success-message">{message}</p>}

      {result && (
        <div className="experience-result">
          <div className="match-summary">
            <h4>岗位匹配概览</h4>
            <div className="match-score">
              <strong>{result.match_summary?.score ?? 0}</strong>
              <span>匹配分</span>
            </div>
            {result.match_summary?.matched?.length > 0 && (
              <p>
                <strong>已匹配：</strong>
                {result.match_summary.matched.join('、')}
              </p>
            )}
            {result.match_summary?.partial?.length > 0 && (
              <p>
                <strong>部分匹配：</strong>
                {result.match_summary.partial.join('、')}
              </p>
            )}
            {result.missing_requirements?.length > 0 && (
              <div className="warning-message">
                <strong>缺少真实证据的要求：</strong>
                {result.missing_requirements
                  .map((item) => item.requirement)
                  .join('、')}
              </div>
            )}
          </div>

          {result.review?.unsupported_claims?.length > 0 && (
            <div className="warning-message" role="alert">
              <strong>真实性检查已拦截以下内容：</strong>
              <ul>
                {result.review.unsupported_claims.map((claim, index) => (
                  <li key={`${claim.claim_id}-${index}`}>
                    {claim.reason}
                    {claim.text ? `：${claim.text}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.review?.needs_user_confirmation?.length > 0 && (
            <div className="hint-block">
              <strong>需要你确认：</strong>
              <ul>
                {result.review.needs_user_confirmation.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {(result.work_experiences || []).map(
            (experience, experienceIndex) => (
              <div
                className="generated-experience"
                key={`${experience.source_experience_id}-${experienceIndex}`}
              >
                <h4>
                  {experience.company} · {experience.position}
                </h4>
                <p className="experience-dates">
                  {experience.start_date} - {experience.end_date}
                </p>
                {(experience.bullets || []).map((bullet, bulletIndex) => (
                  <div className="bullet-editor" key={bullet.claim_id}>
                    <div className="bullet-original">
                      <span>原始经历</span>
                      <p>{bullet.original_text}</p>
                    </div>
                    <textarea
                      rows={3}
                      readOnly={locked}
                      value={bullet.text}
                      onChange={(event) =>
                        updateBullet(
                          'work_experiences',
                          experienceIndex,
                          bulletIndex,
                          event.target.value
                        )
                      }
                    />
                    <div className="bullet-meta">
                      <span>
                        {bullet.verification_status === 'supported'
                          ? '真实性已通过'
                          : '已由你修改'}
                      </span>
                      <span>证据 {bullet.evidence_ids?.length || 0} 条</span>
                      {!locked && (
                        <>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => handleRegenerate(bullet)}
                          >
                            重新生成这条
                          </button>
                          <button
                            type="button"
                            className="link-button danger"
                            onClick={() =>
                              removeBullet(
                                'work_experiences',
                                experienceIndex,
                                bulletIndex
                              )
                            }
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {(result.project_experiences || []).map(
            (experience, experienceIndex) => (
              <div
                className="generated-experience"
                key={`${experience.source_experience_id}-${experienceIndex}`}
              >
                <h4>
                  {experience.project_name} · {experience.role}
                </h4>
                <p className="experience-dates">
                  {experience.start_date} - {experience.end_date}
                  {experience.tech_stack?.length
                    ? ` · ${experience.tech_stack.join('、')}`
                    : ''}
                </p>
                {(experience.bullets || []).map((bullet, bulletIndex) => (
                  <div className="bullet-editor" key={bullet.claim_id}>
                    <div className="bullet-original">
                      <span>原始经历</span>
                      <p>{bullet.original_text}</p>
                    </div>
                    <textarea
                      rows={3}
                      value={bullet.text}
                      onChange={(event) =>
                        updateBullet(
                          'project_experiences',
                          experienceIndex,
                          bulletIndex,
                          event.target.value
                        )
                      }
                    />
                    <div className="bullet-meta">
                      <span>
                        {bullet.verification_status === 'supported'
                          ? '真实性已通过'
                          : '已由你修改'}
                      </span>
                      <span>证据 {bullet.evidence_ids?.length || 0} 条</span>
                      {!locked && (
                        <>
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => handleRegenerate(bullet)}
                          >
                            重新生成这条
                          </button>
                          <button
                            type="button"
                            className="link-button danger"
                            onClick={() =>
                              removeBullet(
                                'project_experiences',
                                experienceIndex,
                                bulletIndex
                              )
                            }
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          <div className="result-actions">
            {!locked && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSave()}
                >
                  保存修改
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSave({ confirm: true })}
                >
                  确认并保存当前岗位版本
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCopy}
            >
              复制全部
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadHistory}
              disabled={historyLoading}
            >
              {historyLoading ? '加载中...' : '历史版本'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={startGeneration}
            >
              重新生成整套
            </button>
          </div>
          {history.length > 0 && (
            <div className="version-history">
              <h5>该岗位历史版本</h5>
              <ul>
                {history.map((item) => (
                  <li
                    key={item.id}
                    className={item.id === generation.id ? 'current' : ''}
                  >
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => openVersion(item.id)}
                    >
                      v{item.versionNo} ·{' '}
                      {STATUS_TEXT[item.status] || item.status}
                    </button>
                    <small>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ''}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {locked && (
            <p className="hint">
              当前版本已确认，不能直接修改；如需调整请重新生成整套。
            </p>
          )}
          <p className="hint">
            生成结果不会覆盖原始经历库或已保存简历；每个岗位保留独立版本。
          </p>
        </div>
      )}
    </div>
  );
};

export default ExperienceCustomizer;
