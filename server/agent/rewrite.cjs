const { reviewDraft } = require('./reviewer.cjs');
const {
  WRITER_SYSTEM_PROMPT,
  buildRewriteExperiencePrompt,
  parseJsonContent,
} = require('./writer.cjs');

const EVIDENCE_ID = 'ev_editor';
const SOURCE_ID = 'editor_entry';

function text(value) {
  return String(value ?? '').trim();
}

function stringList(value) {
  return (Array.isArray(value) ? value : []).map(text).filter(Boolean);
}

function originalParts(experience) {
  return [
    text(experience?.description),
    ...stringList(experience?.responsibilities),
    ...stringList(experience?.achievements),
  ].filter(Boolean);
}

function hasJobAnalysis(value) {
  if (!value || typeof value !== 'object') return false;
  return Boolean(
    text(value.position) ||
      text(value.job_title) ||
      stringList(value.coreRequirements).length ||
      stringList(value.required_skills).length
  );
}

function buildSourceExperience(kind, experience) {
  const isWork = kind === 'work';
  return {
    id: SOURCE_ID,
    kind: isWork ? 'employment' : 'project',
    organization: text(isWork ? experience.company : experience.name),
    title: text(isWork ? experience.title : experience.role),
    startDate: text(experience.dates),
    endDate: '',
    data: {
      name: text(experience.name),
      role: text(experience.role),
      description: text(experience.description),
      responsibilities: stringList(experience.responsibilities),
      achievements: stringList(experience.achievements),
      techStack: stringList(experience.techStack),
    },
    evidence: [
      {
        id: EVIDENCE_ID,
        text: originalParts(experience).join('；'),
      },
    ],
  };
}

function buildBullets(parsed) {
  const bullets = [];
  const description = text(parsed?.description);
  if (description) {
    bullets.push({
      claim_id: 'field_description',
      text: description,
      evidence_ids: [EVIDENCE_ID],
    });
  }
  stringList(parsed?.responsibilities).forEach((value, index) => {
    bullets.push({
      claim_id: `field_responsibility_${index}`,
      text: value,
      evidence_ids: [EVIDENCE_ID],
    });
  });
  stringList(parsed?.achievements).forEach((value, index) => {
    bullets.push({
      claim_id: `field_achievement_${index}`,
      text: value,
      evidence_ids: [EVIDENCE_ID],
    });
  });
  return bullets;
}

function buildDraft(kind, experience, source, bullets) {
  if (kind === 'work') {
    return {
      work_experiences: [
        {
          source_experience_id: SOURCE_ID,
          company: source.organization,
          position: source.title,
          bullets,
        },
      ],
      project_experiences: [],
      missing_requirements: [],
    };
  }
  return {
    work_experiences: [],
    project_experiences: [
      {
        source_experience_id: SOURCE_ID,
        project_name: source.data.name || source.organization,
        tech_stack: source.data.techStack,
        bullets,
      },
    ],
    missing_requirements: [],
  };
}

function reviewedFields(reviewedEntry) {
  const bullets = reviewedEntry?.bullets || [];
  const byPrefix = (prefix) =>
    bullets
      .filter((bullet) => bullet.claim_id.startsWith(prefix))
      .map((bullet) => bullet.text);
  return {
    description:
      bullets.find((bullet) => bullet.claim_id === 'field_description')?.text ||
      '',
    responsibilities: byPrefix('field_responsibility_'),
    achievements: byPrefix('field_achievement_'),
  };
}

async function rewriteExperience({
  model,
  kind,
  jobAnalysis,
  experience,
  userFeedback,
}) {
  if (!['work', 'project'].includes(kind)) {
    const error = new Error('kind 必须是 work 或 project');
    error.statusCode = 400;
    throw error;
  }
  if (!hasJobAnalysis(jobAnalysis)) {
    const error = new Error('请先完成岗位分析，再重新生成');
    error.statusCode = 400;
    throw error;
  }
  if (!experience || typeof experience !== 'object') {
    const error = new Error('experience 必须是对象');
    error.statusCode = 400;
    throw error;
  }
  if (!originalParts(experience).length) {
    const error = new Error('请先填写这段经历的描述、职责或成果');
    error.statusCode = 400;
    throw error;
  }

  const raw = await model.completeText({
    step: 'rewrite_experience',
    system: WRITER_SYSTEM_PROMPT,
    user: buildRewriteExperiencePrompt({
      jobAnalysis,
      kind,
      experience,
      userFeedback,
    }),
  });
  let parsed;
  try {
    parsed = parseJsonContent(raw);
  } catch {
    const error = new Error('模型返回内容不是合法 JSON，请重试');
    error.statusCode = 502;
    throw error;
  }

  const source = buildSourceExperience(kind, experience);
  const bullets = buildBullets(parsed);
  if (!bullets.length) {
    const error = new Error('模型没有返回可用的经历内容，请重试');
    error.statusCode = 422;
    throw error;
  }

  const reviewed = reviewDraft({
    draft: buildDraft(kind, experience, source, bullets),
    retrieval: { summary: {}, partial: [], missing_requirements: [] },
    experiences: [source],
  });
  const reviewedEntry =
    kind === 'work'
      ? reviewed.work_experiences[0]
      : reviewed.project_experiences[0];
  if (reviewed.review.unsupported_claims.length || !reviewedEntry) {
    const error = new Error(
      reviewed.review.unsupported_claims[0]?.reason ||
        '重新生成的内容未通过真实性检查'
    );
    error.statusCode = 422;
    error.code = 'UNSUPPORTED_CLAIM';
    error.details = reviewed.review.unsupported_claims;
    throw error;
  }

  return reviewedFields(reviewedEntry);
}

module.exports = { rewriteExperience, buildSourceExperience };
