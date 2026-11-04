const { stableHash } = require('../ids.cjs');
const { experienceText } = require('./matching.cjs');
const { aliasesFor, findTechMentions, normalize } = require('./tech.cjs');

const METRIC_PATTERN =
  /(\d+(?:\.\d+)?)\s*(%|qps|tps|ms|毫秒|秒|万|亿|倍|人|个|台|次)/gi;
const INFLATION_PATTERN =
  /(架构师|架构设计|主导架构|从零架构|技术负责人|团队负责人|负责人)/;
const TEAM_PATTERN = /(\d+)\s*(?:人|名)(?:的)?(?:团队|成员)/;

function text(value, max = 4000) {
  return String(value ?? '')
    .trim()
    .slice(0, max);
}

function sourceText(experience) {
  return normalize(experienceText(experience));
}

function sourceEvidenceIds(experience) {
  return new Set((experience.evidence || []).map((item) => item.id));
}

function evidenceText(experience, ids) {
  const wanted = new Set(ids || []);
  return (experience.evidence || [])
    .filter((item) => wanted.has(item.id))
    .map((item) => item.text)
    .join('；');
}

function metricSupported(metric, source) {
  const raw = `${metric[1]}${metric[2]}`.toLowerCase();
  const number = String(metric[1]);
  const unit = String(metric[2]).toLowerCase();
  if (source.includes(raw)) return true;
  const escapedNumber = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedUnit = unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(^|[^0-9])${escapedNumber}\\s*${escapedUnit}([^a-z0-9]|$)`,
    'i'
  ).test(source);
}

function techUnsupported(bulletText, experience) {
  const source = sourceText(experience);
  const mentioned = findTechMentions(bulletText);
  const supported = new Set(
    findTechMentions(source).flatMap((term) => aliasesFor(term))
  );
  return mentioned.filter(
    (term) => !aliasesFor(term).some((alias) => supported.has(normalize(alias)))
  );
}

function claimId(section, sourceId, index) {
  return `claim_${stableHash(`${section}:${sourceId}:${index}`).slice(0, 16)}`;
}

function bulletReview({ bullet, experience, section, index, unsupported }) {
  const id = bullet.claim_id || claimId(section, experience.id, index);
  const bulletText = text(bullet.text, 1200);
  if (!bulletText) {
    unsupported.push({
      claim_id: id,
      source_experience_id: experience.id,
      section,
      text: '',
      reason: '描述内容为空',
    });
    return null;
  }
  const allowed = sourceEvidenceIds(experience);
  const evidenceIds = (Array.isArray(bullet.evidence_ids)
    ? bullet.evidence_ids
    : []
  )
    .map((value) => text(value, 120))
    .filter((value) => allowed.has(value));
  if (!evidenceIds.length) {
    unsupported.push({
      claim_id: id,
      source_experience_id: experience.id,
      section,
      text: bulletText,
      reason: '缺少可追溯的原始经历证据',
    });
    return null;
  }
  const cited = normalize(evidenceText(experience, evidenceIds));
  const wholeSource = sourceText(experience);

  const extraTech = techUnsupported(bulletText, experience);
  if (extraTech.length) {
    unsupported.push({
      claim_id: id,
      source_experience_id: experience.id,
      section,
      text: bulletText,
      reason: `原始经历没有 ${extraTech.join('、')} 的技术证据`,
    });
    return null;
  }

  const metrics = [...bulletText.matchAll(METRIC_PATTERN)];
  const badMetric = metrics.find(
    (metric) => !metricSupported(metric, wholeSource) && !metricSupported(metric, cited)
  );
  if (badMetric) {
    unsupported.push({
      claim_id: id,
      source_experience_id: experience.id,
      section,
      text: bulletText,
      reason: `原始经历没有 ${badMetric[1]}${badMetric[2]} 的量化证据`,
    });
    return null;
  }

  const team = bulletText.match(TEAM_PATTERN);
  if (
    team &&
    !new RegExp(`(^|[^0-9])${team[1]}\\s*(人|名)([^0-9]|$)`).test(wholeSource)
  ) {
    unsupported.push({
      claim_id: id,
      source_experience_id: experience.id,
      section,
      text: bulletText,
      reason: `原始经历没有 ${team[1]} 人团队规模的证据`,
    });
    return null;
  }

  const sourceTitle = normalize(`${experience.title} ${experience.data?.role || ''}`);
  if (
    INFLATION_PATTERN.test(bulletText) &&
    !INFLATION_PATTERN.test(sourceTitle) &&
    !wholeSource.includes('架构') &&
    !wholeSource.includes('负责人')
  ) {
    unsupported.push({
      claim_id: id,
      source_experience_id: experience.id,
      section,
      text: bulletText,
      reason: '原始职位与经历不支持架构师/负责人级别的职责描述',
    });
    return null;
  }

  const original = evidenceText(experience, evidenceIds) || experienceText(experience);
  return {
    claim_id: id,
    text: bulletText,
    original_text: text(original, 2000),
    evidence_ids: evidenceIds,
    verification_status: 'supported',
  };
}

function normalizeSectionItems(draftItems, kind, experiencesById, unsupported) {
  const list = Array.isArray(draftItems) ? draftItems : [];
  const out = [];
  for (const item of list.slice(0, 8)) {
    const sourceId = text(item.source_experience_id, 160);
    const source = experiencesById.get(sourceId);
    if (!source || source.kind !== kind) {
      unsupported.push({
        claim_id: text(item.claim_id, 120) || `claim_unknown_${out.length}`,
        source_experience_id: sourceId,
        section: kind === 'employment' ? 'work' : 'project',
        text: text(item.project_name || item.company, 200),
        reason:
          kind === 'employment'
            ? '来源不是用户真实工作经历，或经历已被删除'
            : '来源不是用户真实项目经历，或项目已被删除',
      });
      continue;
    }
    const section = kind === 'employment' ? 'work' : 'project';
    if (kind === 'employment') {
      if (text(item.company, 200) && text(item.company, 200) !== source.organization) {
        unsupported.push({
          claim_id: text(item.claim_id, 120),
          source_experience_id: sourceId,
          section,
          text: text(item.company, 200),
          reason: '公司名称与原始经历不一致，已使用原始公司名称',
        });
      }
      if (text(item.position, 200) && text(item.position, 200) !== source.title) {
        unsupported.push({
          claim_id: text(item.claim_id, 120),
          source_experience_id: sourceId,
          section,
          text: text(item.position, 200),
          reason: '职位名称与原始经历不一致，已使用原始职位',
        });
      }
    } else if (
      text(item.project_name, 200) &&
      text(item.project_name, 200) !== source.organization &&
      text(item.project_name, 200) !== source.data?.name
    ) {
      unsupported.push({
        claim_id: text(item.claim_id, 120),
        source_experience_id: sourceId,
        section,
        text: text(item.project_name, 200),
        reason: '项目名称与原始经历不一致，已使用原始项目名称',
      });
    }

    const bullets = (Array.isArray(item.bullets) ? item.bullets : [])
      .slice(0, 10)
      .map((bullet, index) =>
        bulletReview({ bullet, experience: source, section, index, unsupported })
      )
      .filter(Boolean);

    const entry = {
      source_experience_id: source.id,
      bullets,
    };
    if (kind === 'employment') {
      entry.company = source.organization;
      entry.position = source.title;
      entry.start_date = source.startDate;
      entry.end_date = source.endDate;
    } else {
      entry.project_name = source.data?.name || source.organization;
      entry.role = source.data?.role || source.title;
      entry.start_date = source.startDate;
      entry.end_date = source.endDate;
      const sourceTech = new Set(
        (source.data?.techStack || []).map((value) => normalize(value))
      );
      const modelTech = Array.isArray(item.tech_stack) ? item.tech_stack : [];
      entry.tech_stack = modelTech
        .map((value) => text(value, 80))
        .filter((value) => sourceTech.has(normalize(value)));
      if (entry.tech_stack.length < modelTech.length) {
        unsupported.push({
          claim_id: `tech_${source.id}`,
          source_experience_id: source.id,
          section,
          text: modelTech.join('、'),
          reason: '技术栈包含原始项目没有证据的技术，已移除',
        });
      }
    }
    out.push(entry);
  }
  return out;
}

function reviewDraft({ draft, retrieval, experiences }) {
  const unsupported = [];
  const experiencesById = new Map(experiences.map((item) => [item.id, item]));
  const work = normalizeSectionItems(
    draft?.work_experiences,
    'employment',
    experiencesById,
    unsupported
  );
  const projects = normalizeSectionItems(
    draft?.project_experiences,
    'project',
    experiencesById,
    unsupported
  );
  const draftMissing = Array.isArray(draft?.missing_requirements)
    ? draft.missing_requirements.map((item) => ({
        requirement: text(item?.requirement || item, 200),
        reason: text(item?.reason, 500) || '当前个人经历没有对应证据',
      }))
    : [];
  const seenMissing = new Set(draftMissing.map((item) => item.requirement));
  const missing = [
    ...draftMissing,
    ...(retrieval.missing_requirements || []).filter(
      (item) => !seenMissing.has(item.requirement)
    ),
  ].filter((item) => item.requirement);

  const needs = [];
  if (unsupported.length) {
    needs.push('存在已被拦截的无证据描述，请人工确认原始经历');
  }
  if (missing.length) {
    needs.push(
      `岗位要求未完全匹配：${missing.map((item) => item.requirement).join('、')}`
    );
  }
  if ((retrieval.partial || []).length) {
    needs.push('部分经历只有间接证据，请确认展示措辞是否符合实际');
  }

  return {
    work_experiences: work,
    project_experiences: projects,
    missing_requirements: missing,
    review: {
      unsupported_claims: unsupported,
      needs_user_confirmation: needs,
      passed: unsupported.length === 0,
    },
  };
}

function rebuildGenerationResult({ draft, retrieval, experiences, jobAnalysis }) {
  const reviewed = reviewDraft({ draft, retrieval, experiences });
  return {
    job_analysis: {
      job_title: jobAnalysis.job_title,
      key_requirements: jobAnalysis.required_skills,
    },
    match_summary: retrieval.summary,
    work_experiences: reviewed.work_experiences,
    project_experiences: reviewed.project_experiences,
    missing_requirements: reviewed.missing_requirements,
    review: reviewed.review,
  };
}

module.exports = {
  METRIC_PATTERN,
  reviewDraft,
  rebuildGenerationResult,
};
