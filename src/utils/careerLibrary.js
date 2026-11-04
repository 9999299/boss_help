export const CAREER_LIBRARY_KEY = 'careerLibrary';

const EMPTY_LIBRARY = {
  version: 1,
  experiences: [],
  updatedAt: null,
};

const KINDS = new Set([
  'employment',
  'project',
  'education',
  'skill',
  'achievement',
]);

function asString(value, max = 4000) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function asStringArray(value, maxItems = 50, maxLength = 1000) {
  return (Array.isArray(value) ? value : [])
    .map((item) => asString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function newExperienceId(prefix = 'exp') {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeExperienceItem(item) {
  if (!item || typeof item !== 'object') return null;
  const id = asString(item.id, 120);
  const kind = KINDS.has(item.kind) ? item.kind : '';
  if (!id || !kind) return null;
  const data = item.data && typeof item.data === 'object' ? item.data : {};
  return {
    id,
    kind,
    organization: asString(item.organization, 200),
    title: asString(item.title, 200),
    startDate: asString(item.startDate, 40),
    endDate: asString(item.endDate, 40),
    source: asString(item.source, 40) || 'user',
    userConfirmed: item.userConfirmed === true,
    data: {
      description: asString(data.description, 4000),
      responsibilities: asStringArray(data.responsibilities),
      achievements: asStringArray(data.achievements),
      techStack: asStringArray(data.techStack, 30, 80),
      role: asString(data.role, 200),
      location: asString(data.location, 200),
      name: asString(data.name, 200),
      school: asString(data.school, 200),
      major: asString(data.major, 200),
      degree: asString(data.degree, 100),
      level: asString(data.level, 100),
    },
    evidence: Array.isArray(item.evidence)
      ? item.evidence
          .map((entry) => ({
            id: asString(entry?.id, 120),
            text: asString(entry?.text, 2000),
          }))
          .filter((entry) => entry.id && entry.text)
      : [],
  };
}

export function normalizeCareerLibrary(input) {
  const source = input && typeof input === 'object' ? input : {};
  const seen = new Set();
  return {
    version: 1,
    experiences: (Array.isArray(source.experiences) ? source.experiences : [])
      .map(normalizeExperienceItem)
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }),
    updatedAt: source.updatedAt || null,
  };
}

export function createExperience(kind, changes = {}) {
  return normalizeExperienceItem({
    id: newExperienceId(kind === 'project' ? 'prj' : 'exp'),
    kind,
    source: 'user',
    userConfirmed: false,
    data: kind === 'project' ? { name: '', techStack: [] } : {},
    ...changes,
  });
}

export function hasConfirmedExperience(library) {
  const normalized = normalizeCareerLibrary(library);
  return normalized.experiences.some(
    (item) =>
      ['employment', 'project'].includes(item.kind) && item.userConfirmed
  );
}

export function libraryStats(library) {
  const normalized = normalizeCareerLibrary(library);
  return {
    employment: normalized.experiences.filter(
      (item) => item.kind === 'employment'
    ).length,
    project: normalized.experiences.filter((item) => item.kind === 'project')
      .length,
    confirmed: normalized.experiences.filter((item) => item.userConfirmed)
      .length,
  };
}

export function updateExperience(library, id, changes) {
  const normalized = normalizeCareerLibrary(library);
  return {
    ...normalized,
    experiences: normalized.experiences.map((item) =>
      item.id === id
        ? normalizeExperienceItem({
            ...item,
            ...changes,
            data: { ...item.data, ...(changes.data || {}) },
            userConfirmed: false,
          })
        : item
    ),
  };
}

export function replaceExperience(library, experience) {
  const normalized = normalizeCareerLibrary(library);
  const exists = normalized.experiences.some(
    (item) => item.id === experience.id
  );
  return {
    ...normalized,
    experiences: exists
      ? normalized.experiences.map((item) =>
          item.id === experience.id ? experience : item
        )
      : [...normalized.experiences, experience],
  };
}

export function removeExperience(library, id) {
  const normalized = normalizeCareerLibrary(library);
  return {
    ...normalized,
    experiences: normalized.experiences.filter((item) => item.id !== id),
  };
}

export function confirmExperience(library, id, confirmed = true) {
  const normalized = normalizeCareerLibrary(library);
  return {
    ...normalized,
    experiences: normalized.experiences.map((item) =>
      item.id === id ? { ...item, userConfirmed: confirmed } : item
    ),
  };
}

export function mergeImportedExperiences(library, experiences) {
  const normalized = normalizeCareerLibrary(library);
  const existing = new Set(normalized.experiences.map((item) => item.id));
  return {
    ...normalized,
    experiences: [
      ...normalized.experiences,
      ...(experiences || []).filter((item) => !existing.has(item.id)),
    ],
  };
}

function storageArea() {
  return globalThis.chrome?.storage?.local;
}

export async function loadCareerLibrary() {
  const area = storageArea();
  if (!area) return normalizeCareerLibrary(EMPTY_LIBRARY);
  return new Promise((resolve, reject) => {
    try {
      area.get([CAREER_LIBRARY_KEY], (result) => {
        if (globalThis.chrome?.runtime?.lastError) {
          reject(new Error(globalThis.chrome.runtime.lastError.message));
          return;
        }
        resolve(normalizeCareerLibrary(result?.[CAREER_LIBRARY_KEY]));
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function saveCareerLibrary(library) {
  const normalized = normalizeCareerLibrary({
    ...library,
    updatedAt: new Date().toISOString(),
  });
  const area = storageArea();
  if (!area) return normalized;
  return new Promise((resolve, reject) => {
    try {
      area.set({ [CAREER_LIBRARY_KEY]: normalized }, () => {
        if (globalThis.chrome?.runtime?.lastError) {
          reject(new Error(globalThis.chrome.runtime.lastError.message));
          return;
        }
        resolve(normalized);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export { EMPTY_LIBRARY, KINDS };
