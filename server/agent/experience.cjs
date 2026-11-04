const { stableHash } = require('../ids.cjs');

const KINDS = new Set([
  'employment',
  'project',
  'education',
  'skill',
  'achievement',
]);

function text(value, max = 4000) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function strings(value, maxItems = 50, maxLength = 1000) {
  return (Array.isArray(value) ? value : [])
    .map((item) => text(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function evidenceId(experienceId, value, index) {
  return `ev_${stableHash(`${experienceId}:${index}:${value}`).slice(0, 16)}`;
}

function buildEvidence(experience) {
  const data = experience.data || {};
  const sourceTexts = [
    data.description,
    ...(data.responsibilities || []),
    ...(data.achievements || []),
    ...(experience.kind === 'project' ? data.techStack || [] : []),
    ...(experience.kind === 'skill' ? [data.level] : []),
    experience.organization,
    experience.title,
  ]
    .map((item) => text(item))
    .filter(Boolean);
  const provided = (Array.isArray(experience.evidence) ? experience.evidence : [])
    .map((item) => ({
      id: text(item?.id, 120),
      text: text(item?.text, 2000),
    }))
    .filter((item) => item.id && item.text);
  const seen = new Set();
  const result = [];
  for (const item of provided) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  sourceTexts.forEach((value, index) => {
    const id = evidenceId(experience.id, value, index);
    if (seen.has(id)) return;
    seen.add(id);
    result.push({ id, text: value });
  });
  return result;
}

function normalizeExperience(item) {
  if (!item || typeof item !== 'object') return null;
  const id = text(item.id, 120);
  const kind = KINDS.has(item.kind) ? item.kind : '';
  if (!id || !kind) return null;
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  const normalized = {
    id,
    kind,
    organization: text(item.organization, 200),
    title: text(item.title, 200),
    startDate: text(item.startDate, 40),
    endDate: text(item.endDate, 40),
    source: text(item.source, 40) || 'user',
    userConfirmed: item.userConfirmed === true,
    data: {
      description: text(data.description, 4000),
      responsibilities: strings(data.responsibilities),
      achievements: strings(data.achievements),
      techStack: strings(data.techStack, 30, 80),
      role: text(data.role, 200),
      location: text(data.location, 200),
      school: text(data.school, 200),
      major: text(data.major, 200),
      degree: text(data.degree, 100),
      level: text(data.level, 100),
      name: text(data.name, 200),
    },
  };
  normalized.evidence = buildEvidence(normalized);
  return normalized;
}

function normalizeCareerExperiences(input, { onlyConfirmed = false } = {}) {
  const seen = new Set();
  return (Array.isArray(input) ? input : [])
    .slice(0, 300)
    .map(normalizeExperience)
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return !onlyConfirmed || item.userConfirmed;
    });
}

function usableExperiences(experiences) {
  return normalizeCareerExperiences(experiences, { onlyConfirmed: true }).filter(
    (item) => item.evidence.length > 0
  );
}

module.exports = {
  KINDS,
  normalizeCareerExperiences,
  usableExperiences,
};
