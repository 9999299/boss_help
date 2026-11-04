const { containsSkill, findTechMentions, normalize } = require('./tech.cjs');

function stopWords() {
  return new Set([
    '负责',
    '参与',
    '相关',
    '工作',
    '经验',
    '能力',
    '熟悉',
    '了解',
    '优先',
    '要求',
    '以及',
    '进行',
    '完成',
    '实现',
    '项目',
    '团队',
    '公司',
    '岗位',
    '开发',
    '设计',
    '维护',
    '支持',
    '具有',
    '以上',
    '具备',
    '良好',
    '扎实',
  ]);
}

function tokens(value) {
  const source = normalize(value);
  const result = new Set();
  for (const word of source.match(/[a-z][a-z0-9+#.]{1,}/g) || []) {
    if (word.length >= 2) result.add(word);
  }
  const chinese = source.replace(/[^\u4e00-\u9fa5]/g, ' ');
  const stop = stopWords();
  for (const run of chinese.split(/\s+/).filter(Boolean)) {
    for (let i = 0; i < run.length - 1; i += 1) {
      const gram = run.slice(i, i + 2);
      if (!stop.has(gram)) result.add(gram);
    }
  }
  return result;
}

function overlapScore(a, b) {
  if (!a.size || !b.size) return 0;
  let hits = 0;
  for (const item of a) {
    if (b.has(item)) hits += 1;
  }
  return hits / Math.min(a.size, b.size);
}

function experienceText(experience) {
  return [
    experience.organization,
    experience.title,
    experience.data?.role,
    experience.data?.description,
    ...(experience.data?.responsibilities || []),
    ...(experience.data?.achievements || []),
    ...(experience.data?.techStack || []),
    ...(experience.evidence || []).map((item) => item.text),
  ]
    .filter(Boolean)
    .join(' ');
}

function experienceSkills(experience) {
  const explicit = [
    ...(experience.data?.techStack || []),
    ...(experience.data?.skills || []),
  ];
  return new Set(
    [...explicit, ...findTechMentions(experienceText(experience))].map(
      (item) => normalize(item)
    )
  );
}

function scoreExperience(experience, jobAnalysis, referenceTokens) {
  const text = experienceText(experience);
  const lowerText = normalize(text);
  const required = jobAnalysis.required_skills || [];
  const preferred = jobAnalysis.preferred_skills || [];
  const matchedRequired = required.filter((skill) =>
    containsSkill(lowerText, skill)
  );
  const matchedPreferred = preferred.filter((skill) =>
    containsSkill(lowerText, skill)
  );
  const requiredRatio = required.length
    ? matchedRequired.length / required.length
    : 0;
  const preferredRatio = preferred.length
    ? matchedPreferred.length / preferred.length
    : 0;
  const responsibilityRatio = overlapScore(
    tokens((jobAnalysis.responsibilities || []).join(' ')),
    tokens(text)
  );
  const titleRatio = overlapScore(
    tokens(
      [
        jobAnalysis.job_title,
        ...(jobAnalysis.responsibilities || []),
      ].join(' ')
    ),
    tokens(
      [experience.title, experience.data?.role, experience.organization].join(
        ' '
      )
    )
  );
  const sharedReference = overlapScore(referenceTokens, tokens(text));
  const score =
    requiredRatio * 0.5 +
    preferredRatio * 0.12 +
    responsibilityRatio * 0.2 +
    titleRatio * 0.1 +
    sharedReference * 0.08;
  const relevant =
    matchedRequired.length > 0 ||
    score >= 0.22 ||
    sharedReference >= 0.3;
  const level =
    matchedRequired.length >= 2 || score >= 0.52
      ? 'direct'
      : relevant
        ? 'partial'
        : 'unrelated';
  return {
    score: Math.round(Math.min(score, 1) * 100),
    level,
    matched_skills: [...matchedRequired, ...matchedPreferred],
    matched_required: matchedRequired,
    matched_preferred: matchedPreferred,
    responsibility_overlap: Math.round(responsibilityRatio * 100),
  };
}

function buildMatchSummary(jobAnalysis, scored) {
  const availableSkills = new Set();
  const availableText = scored.map((item) => experienceText(item.experience)).join(' ');
  for (const item of scored) {
    for (const skill of experienceSkills(item.experience)) {
      availableSkills.add(skill);
    }
  }
  const matched = [];
  const partial = [];
  const missing = [];
  for (const skill of jobAnalysis.required_skills || []) {
    const direct = scored.some((item) =>
      item.matched_required.some((value) => normalize(value) === normalize(skill))
    );
    if (direct) matched.push(skill);
    else if (containsSkill(availableText, skill)) partial.push(skill);
    else missing.push(skill);
  }
  const relevantScores = scored
    .filter((item) => item.level !== 'unrelated')
    .map((item) => item.score);
  const coverage = jobAnalysis.required_skills?.length
    ? matched.length / jobAnalysis.required_skills.length
    : 0;
  const semantic = relevantScores.length
    ? relevantScores.reduce((sum, value) => sum + value, 0) /
      relevantScores.length /
      100
    : 0;
  return {
    score: Math.round(Math.min(100, coverage * 75 + semantic * 25)),
    matched,
    partial,
    missing,
  };
}

function retrieveExperiences({ jobAnalysis, experiences }) {
  const referenceTokens = tokens(
    [
      jobAnalysis.job_title,
      jobAnalysis.domain,
      ...(jobAnalysis.required_skills || []),
      ...(jobAnalysis.preferred_skills || []),
      ...(jobAnalysis.responsibilities || []),
      ...(jobAnalysis.requirements || []),
    ].join(' ')
  );
  const scored = experiences.map((experience) => {
    const result = scoreExperience(experience, jobAnalysis, referenceTokens);
    return {
      experience,
      ...result,
    };
  });
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  return {
    job_analysis: jobAnalysis,
    ranked: ranked.map((item) => ({
      source_experience_id: item.experience.id,
      kind: item.experience.kind,
      organization: item.experience.organization,
      title: item.experience.title,
      score: item.score,
      level: item.level,
      matched_skills: item.matched_skills,
      responsibility_overlap: item.responsibility_overlap,
    })),
    direct: ranked
      .filter((item) => item.level === 'direct')
      .map((item) => item.experience.id),
    partial: ranked
      .filter((item) => item.level === 'partial')
      .map((item) => item.experience.id),
    missing_requirements: (jobAnalysis.required_skills || [])
      .filter(
        (skill) =>
          !experiences.some((experience) =>
            containsSkill(experienceText(experience), skill)
          )
      )
      .map((skill) => ({
        requirement: skill,
        reason: '当前个人经历没有对应证据',
      })),
    summary: buildMatchSummary(jobAnalysis, scored),
  };
}

function planExperiences({ retrieval, experiences, options = {} }) {
  const byId = new Map(experiences.map((item) => [item.id, item]));
  const direct = retrieval.direct
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((item) =>
      options.includeWork === false ? item.kind !== 'employment' : true
    )
    .filter((item) =>
      options.includeProjects === false ? item.kind !== 'project' : true
    );
  const partial = retrieval.partial
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((item) =>
      options.includeWork === false ? item.kind !== 'employment' : true
    )
    .filter((item) =>
      options.includeProjects === false ? item.kind !== 'project' : true
    );
  const selected = [...direct, ...partial]
    .filter((item) => ['employment', 'project'].includes(item.kind))
    .slice(0, 6);
  return {
    selected_experience_ids: selected.map((item) => item.id),
    order: selected.map((item) => ({
      source_experience_id: item.id,
      kind: item.kind,
      reason:
        direct.some((entry) => entry.id === item.id)
          ? '与岗位要求直接相关'
          : '有部分相关证据，可谨慎展示',
    })),
    emphasis: (retrieval.summary.matched || []).slice(0, 8),
    gaps: retrieval.missing_requirements || [],
    include_work_experiences: options.includeWork !== false,
    include_project_experiences: options.includeProjects !== false,
  };
}

module.exports = {
  buildMatchSummary,
  experienceSkills,
  experienceText,
  planExperiences,
  retrieveExperiences,
  tokens,
};
