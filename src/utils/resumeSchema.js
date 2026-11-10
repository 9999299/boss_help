const DEFAULT_PERSONAL_INFO = {
  name: '',
  email: '',
  phone: '',
  summary: '',
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value) {
  return asArray(value)
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function normalizeEvidence(item, defaults) {
  const input = item && typeof item === 'object' ? item : {};
  return {
    ...input,
    source: input.source || defaults.source,
    evidenceStatus: input.evidenceStatus || defaults.evidenceStatus,
    userConfirmed: input.userConfirmed === true,
  };
}

export function normalizeProject(project, source = 'model') {
  const item = normalizeEvidence(project, {
    source,
    evidenceStatus: 'example',
  });
  return {
    ...item,
    name: String(item.name || ''),
    role: String(item.role || ''),
    dates: String(item.dates || ''),
    techStack: asStringArray(item.techStack),
    description: String(item.description || ''),
    responsibilities: asStringArray(item.responsibilities),
    achievements: asStringArray(item.achievements),
  };
}

export function normalizeCompanyCandidate(candidate, source = 'model') {
  const item = normalizeEvidence(candidate, {
    source,
    evidenceStatus: 'candidate',
  });
  return {
    ...item,
    company: String(item.company || ''),
    industry: String(item.industry || ''),
    role: String(item.role || ''),
    location: String(item.location || ''),
    matchReason: String(item.matchReason || ''),
    suggestedResponsibilities: asStringArray(item.suggestedResponsibilities),
  };
}

export function normalizeStrength(strength, source = 'model') {
  const item = normalizeEvidence(strength, {
    source,
    evidenceStatus: 'draft',
  });
  return {
    ...item,
    title: String(item.title || ''),
    description: String(item.description || ''),
    evidenceSuggestions: asStringArray(item.evidenceSuggestions),
    keywords: asStringArray(item.keywords),
  };
}

/**
 * 工作经历条目：公司、职位、在职时间段、主要职责与成果。
 * 默认按草稿处理，需用户核实后才会标记为已确认。
 */
export function normalizeExperience(experience, source = 'model') {
  const item = normalizeEvidence(experience, {
    source,
    evidenceStatus: 'draft',
  });
  return {
    ...item,
    company: String(item.company || ''),
    title: String(item.title || ''),
    dates: String(item.dates || ''),
    location: String(item.location || ''),
    description: String(item.description || ''),
    responsibilities: asStringArray(item.responsibilities),
    achievements: asStringArray(item.achievements),
  };
}

/**
 * 工作年限汇总：总工作年限与相关行业经验年限。
 */
export function normalizeExperienceSummary(summary, source = 'model') {
  const item = normalizeEvidence(summary, {
    source,
    evidenceStatus: 'draft',
  });
  return {
    ...item,
    totalYears: String(item.totalYears || ''),
    industryYears: String(item.industryYears || ''),
    industry: String(item.industry || ''),
  };
}

/**
 * 从 "2020.03 - 2023.06"、"2020-2023"、"2020年3月 - 至今" 等文本中解析起始年月，
 * 用于按时间倒序排列。
 */
export function parseStartDate(dates) {
  const match = String(dates || '').match(/(\d{4})\s*[.\-/年]?\s*(\d{1,2})?/);
  if (!match) return 0;
  const year = Number(match[1]);
  const month = Math.min(Math.max(Number(match[2] || 1), 1), 12);
  return year * 100 + month;
}

/** 按起始时间倒序（最近的在最前）排序，无日期的条目排在末尾。 */
export function sortByDateDesc(list) {
  return asArray(list)
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const diff =
        parseStartDate(b.item?.dates) - parseStartDate(a.item?.dates);
      return diff !== 0 ? diff : a.index - b.index;
    })
    .map((entry) => entry.item);
}

export function normalizeEducation(item, source = 'user') {
  const education = item && typeof item === 'object' ? item : {};
  return {
    ...education,
    school: String(education.school || ''),
    major: String(education.major || ''),
    degree: String(education.degree || ''),
    dates: String(education.dates || ''),
    source: education.source || source,
  };
}

export function normalizeAnalysisResult(result = {}) {
  const input = result && typeof result === 'object' ? result : {};
  return {
    ...input,
    projects: asArray(input.projects).map((item) => normalizeProject(item)),
    experience: sortByDateDesc(
      asArray(input.experience).map((item) =>
        normalizeExperience(item, item?.source || 'model')
      )
    ),
    experienceSummary: normalizeExperienceSummary(
      input.experienceSummary,
      input.experienceSummary?.source || 'model'
    ),
    companyCandidates: asArray(input.companyCandidates).map((item) =>
      normalizeCompanyCandidate(item)
    ),
    strengths: asArray(input.strengths).map((item) => normalizeStrength(item)),
    extractedSkills: asStringArray(input.extractedSkills),
  };
}

export function normalizeResume(resume = {}) {
  const input = resume && typeof resume === 'object' ? resume : {};
  return {
    ...input,
    schemaVersion: 2,
    personalInfo: { ...DEFAULT_PERSONAL_INFO, ...(input.personalInfo || {}) },
    skills: asStringArray(input.skills),
    experienceSummary: normalizeExperienceSummary(
      input.experienceSummary,
      input.experienceSummary?.source || 'user'
    ),
    experience: sortByDateDesc(
      asArray(input.experience).map((item) =>
        normalizeExperience(item, item?.source || 'user')
      )
    ),
    education: sortByDateDesc(
      asArray(input.education).map((item) =>
        normalizeEducation(item, item?.source || 'user')
      )
    ),
    projects: asArray(input.projects).map((item) =>
      normalizeProject(item, item?.source || 'user')
    ),
    companyCandidates: asArray(input.companyCandidates).map((item) =>
      normalizeCompanyCandidate(item, item?.source || 'user')
    ),
    strengths: asArray(input.strengths).map((item) =>
      normalizeStrength(item, item?.source || 'user')
    ),
  };
}

export function updateEvidenceItem(item, changes = {}) {
  const next = { ...(item || {}), ...changes };
  if (!Object.prototype.hasOwnProperty.call(changes, 'userConfirmed')) {
    next.userConfirmed = false;
  }
  return next;
}
