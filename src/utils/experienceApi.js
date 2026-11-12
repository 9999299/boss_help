/* global __ANALYZE_API_URL__ */
import { normalizeCareerLibrary } from './careerLibrary.js';

const API_BASE =
  typeof __ANALYZE_API_URL__ !== 'undefined'
    ? __ANALYZE_API_URL__
    : 'http://localhost:3000';
const SESSION_KEY = 'jobpilotSession';
let memorySession = null;

export class ExperienceApiError extends Error {
  constructor(message, { status, code, details } = {}) {
    super(message);
    this.name = 'ExperienceApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function baseUrl() {
  return String(API_BASE).replace(/\/+$/, '');
}

function storageArea() {
  return globalThis.chrome?.storage?.local;
}

function readSession() {
  const area = storageArea();
  if (!area) return Promise.resolve(memorySession);
  return new Promise((resolve) => {
    try {
      area.get([SESSION_KEY], (result) => {
        resolve(result?.[SESSION_KEY] || memorySession);
      });
    } catch {
      resolve(memorySession);
    }
  });
}

function writeSession(session) {
  memorySession = session;
  const area = storageArea();
  if (!area) return Promise.resolve(session);
  return new Promise((resolve) => {
    try {
      area.set({ [SESSION_KEY]: session }, () => resolve(session));
    } catch {
      resolve(session);
    }
  });
}

async function fetchJson(
  path,
  { method = 'GET', body, token, timeout = 30000 } = {}
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    if (!response.ok) {
      throw new ExperienceApiError(
        payload.message || payload.error || `API error ${response.status}`,
        {
          status: response.status,
          code: payload.error,
          details: payload.details,
        }
      );
    }
    return payload.data ?? payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ExperienceApiError('请求超时，请重试', { code: 'TIMEOUT' });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureSession({ force = false } = {}) {
  const current = force ? null : await readSession();
  if (
    current?.token &&
    current.expiresAt &&
    Number(current.expiresAt) > Date.now() + 60 * 1000
  ) {
    return current;
  }
  const session = await fetchJson('/api/v1/session', {
    method: 'POST',
    body: {},
    token: current?.token,
  });
  await writeSession(session);
  return session;
}

export function resetSessionForTests() {
  memorySession = null;
}

async function authenticatedRequest(path, options = {}) {
  const session = await ensureSession();
  try {
    return await fetchJson(path, { ...options, token: session.token });
  } catch (error) {
    if (error.status !== 401) throw error;
    const refreshed = await ensureSession({ force: true });
    return fetchJson(path, { ...options, token: refreshed.token });
  }
}

function jobSnapshotFrom({ jobData, analysisResult }) {
  const analysis = analysisResult || {};
  return {
    id: analysis.job_id || jobData?.job_id || undefined,
    title: analysis.position || jobData?.position || jobData?.pageTitle || '',
    company: analysis.company || jobData?.company || '',
    description: jobData?.jobDescription || '',
    responsibilities: analysis.keyResponsibilities || [],
    requirements: analysis.coreRequirements || [],
    skills: [
      ...new Set([
        ...(jobData?.skills || []),
        ...(analysis.extractedSkills || []),
        ...(analysis.skillMatch?.matched || []),
      ]),
    ],
    experienceYears: jobData?.experience || '',
    externalUrl: jobData?.pageUrl || '',
    source: 'boss',
  };
}

export async function syncCareerLibrary(library) {
  const normalized = normalizeCareerLibrary(library);
  const data = await authenticatedRequest('/api/v1/career-library', {
    method: 'PUT',
    body: { experiences: normalized.experiences },
  });
  return normalizeCareerLibrary(data);
}

export async function createExperienceGeneration({
  jobData,
  analysisResult,
  library,
  options = {},
}) {
  await syncCareerLibrary(library);
  const data = await authenticatedRequest(
    '/api/v1/jobs/current/generate-experience',
    {
      method: 'POST',
      body: {
        job_snapshot: jobSnapshotFrom({ jobData, analysisResult }),
        job_analysis: analysisResult || undefined,
        generation_mode: options.generationMode || 'targeted',
        include_work_experiences: options.includeWork !== false,
        include_project_experiences: options.includeProjects !== false,
        style: options.style || 'professional',
        idempotency_key: options.idempotencyKey,
      },
      timeout: 60000,
    }
  );
  return data;
}

export async function getAgentRun(runId) {
  return authenticatedRequest(
    `/api/v1/agent-runs/${encodeURIComponent(runId)}`
  );
}

export async function getAgentRunResult(runId) {
  return authenticatedRequest(
    `/api/v1/agent-runs/${encodeURIComponent(runId)}/result`
  );
}

export async function listExperienceGenerations(jobId) {
  return authenticatedRequest(
    `/api/v1/experience-generations?job_id=${encodeURIComponent(jobId)}`
  );
}

export async function getExperienceGeneration(generationId) {
  return authenticatedRequest(
    `/api/v1/experience-generations/${encodeURIComponent(generationId)}`
  );
}

export async function retryAgentRun(runId) {
  return authenticatedRequest(
    `/api/v1/agent-runs/${encodeURIComponent(runId)}/retry`,
    { method: 'POST', body: {} }
  );
}

export async function cancelAgentRun(runId) {
  return authenticatedRequest(
    `/api/v1/agent-runs/${encodeURIComponent(runId)}/cancel`,
    { method: 'POST', body: {} }
  );
}

export async function updateExperienceGeneration(generationId, resultJson) {
  return authenticatedRequest(
    `/api/v1/experience-generations/${encodeURIComponent(generationId)}`,
    {
      method: 'PUT',
      body: { result_json: resultJson },
    }
  );
}

export async function confirmExperienceGeneration(generationId) {
  return authenticatedRequest(
    `/api/v1/experience-generations/${encodeURIComponent(generationId)}/confirm`,
    { method: 'POST', body: {} }
  );
}

export async function generateExampleProjects({
  jobData,
  analysisResult,
  library,
  maxProjects = 3,
}) {
  if (library) await syncCareerLibrary(library);
  return authenticatedRequest('/api/v1/jobs/current/example-projects', {
    method: 'POST',
    body: {
      job_snapshot: jobSnapshotFrom({ jobData, analysisResult }),
      job_analysis: analysisResult || undefined,
      max_projects: maxProjects,
    },
    timeout: 180000,
  });
}

export async function regenerateBullet({
  generationId,
  claimId,
  userFeedback,
}) {
  return authenticatedRequest(
    `/api/v1/experience-generations/${encodeURIComponent(
      generationId
    )}/regenerate-bullet`,
    {
      method: 'POST',
      body: { claim_id: claimId, user_feedback: userFeedback },
      timeout: 60000,
    }
  );
}

export async function regenerateExperience({
  generationId,
  sourceExperienceId,
  userFeedback,
}) {
  return authenticatedRequest(
    `/api/v1/experience-generations/${encodeURIComponent(
      generationId
    )}/regenerate-experience`,
    {
      method: 'POST',
      body: {
        source_experience_id: sourceExperienceId,
        user_feedback: userFeedback,
      },
      timeout: 60000,
    }
  );
}

export async function rewriteExperience({
  kind,
  jobAnalysis,
  experience,
  userFeedback,
}) {
  return authenticatedRequest('/api/v1/rewrite-experience', {
    method: 'POST',
    body: {
      kind,
      job_analysis: jobAnalysis,
      experience,
      user_feedback: userFeedback,
    },
    timeout: 60000,
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

export async function parseResume(file) {
  if (!file) throw new ExperienceApiError('请选择简历文件');
  if (file.size > 3 * 1024 * 1024) {
    throw new ExperienceApiError('简历文件不能超过 3MB');
  }
  const contentBase64 = await fileToBase64(file);
  return authenticatedRequest('/api/v1/resume/parse', {
    method: 'POST',
    body: { filename: file.name, content_base64: contentBase64 },
    timeout: 180000,
  });
}

export async function parseResumeText(text) {
  return authenticatedRequest('/api/v1/resume/parse', {
    method: 'POST',
    body: { text },
    timeout: 180000,
  });
}

export { jobSnapshotFrom };
