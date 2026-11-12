const { reviewDraft } = require('./reviewer.cjs');
const {
  WRITER_SYSTEM_PROMPT,
  buildRegeneratePrompt,
  buildRegenerateExperiencePrompt,
  parseJsonContent,
} = require('./writer.cjs');

function findClaim(result, claimId) {
  for (const section of ['work_experiences', 'project_experiences']) {
    for (const experience of result[section] || []) {
      for (const bullet of experience.bullets || []) {
        if (bullet.claim_id === claimId) {
          return { section, experience, bullet };
        }
      }
    }
  }
  return null;
}

function findExperience(result, sourceExperienceId) {
  for (const [section, key] of [
    ['work', 'work_experiences'],
    ['project', 'project_experiences'],
  ]) {
    const experience = (result[key] || []).find(
      (item) => item.source_experience_id === sourceExperienceId
    );
    if (experience) return { section, key, experience };
  }
  return null;
}

function flattenBullets(result) {
  const bullets = [];
  for (const [section, key] of [
    ['work', 'work_experiences'],
    ['project', 'project_experiences'],
  ]) {
    for (const experience of result[key] || []) {
      for (const [index, bullet] of (experience.bullets || []).entries()) {
        bullets.push({
          section,
          sourceExperienceId: experience.source_experience_id,
          claimId: bullet.claim_id,
          text: bullet.text,
          evidenceIds: bullet.evidence_ids,
          verificationStatus: bullet.verification_status,
          sortOrder: index,
        });
      }
    }
  }
  return bullets;
}

async function regenerateBullet({
  repository,
  model,
  ctx,
  generationId,
  claimId,
  userFeedback,
}) {
  const generation = await repository.getGeneration(ctx, generationId);
  if (!generation) {
    const error = new Error('生成记录不存在');
    error.statusCode = 404;
    throw error;
  }
  if (generation.status === 'confirmed') {
    const error = new Error('已确认的版本不能重新生成，请重新生成整套');
    error.statusCode = 409;
    throw error;
  }
  const result = generation.resultJson;
  const found = findClaim(result, claimId);
  if (!found) {
    const error = new Error('描述不存在');
    error.statusCode = 404;
    throw error;
  }
  const experiences = generation.sourceSnapshot?.experiences || [];
  const source = experiences.find(
    (item) => item.id === found.experience.source_experience_id
  );
  if (!source) {
    const error = new Error('原始经历已不可用，无法重新生成');
    error.statusCode = 409;
    throw error;
  }

  const raw = await model.completeText({
    step: 'regenerate_bullet',
    system: WRITER_SYSTEM_PROMPT,
    user: buildRegeneratePrompt({
      jobAnalysis: generation.sourceSnapshot?.job_analysis || result.job_analysis,
      experience: source,
      claim: found.bullet,
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

  const kind = source.kind;
  const draft =
    kind === 'employment'
      ? {
          work_experiences: [
            {
              source_experience_id: source.id,
              bullets: [
                {
                  claim_id: claimId,
                  text: parsed.text,
                  evidence_ids: parsed.evidence_ids,
                },
              ],
            },
          ],
          project_experiences: [],
          missing_requirements: [],
        }
      : {
          work_experiences: [],
          project_experiences: [
            {
              source_experience_id: source.id,
              tech_stack: source.data?.techStack || [],
              bullets: [
                {
                  claim_id: claimId,
                  text: parsed.text,
                  evidence_ids: parsed.evidence_ids,
                },
              ],
            },
          ],
          missing_requirements: [],
        };

  const reviewed = reviewDraft({
    draft,
    retrieval: {
      summary: result.match_summary,
      partial: [],
      missing_requirements: result.missing_requirements || [],
    },
    experiences: [source],
  });
  const list =
    kind === 'employment'
      ? reviewed.work_experiences[0]
      : reviewed.project_experiences[0];
  const bullet = list?.bullets?.[0];
  if (!bullet) {
    const error = new Error(
      reviewed.review.unsupported_claims[0]?.reason ||
        '重新生成的内容未通过真实性检查'
    );
    error.statusCode = 422;
    error.code = 'UNSUPPORTED_CLAIM';
    error.details = reviewed.review.unsupported_claims;
    throw error;
  }

  const nextResult = JSON.parse(JSON.stringify(result));
  const nextFound = findClaim(nextResult, claimId);
  nextFound.bullet.text = bullet.text;
  nextFound.bullet.original_text = bullet.original_text;
  nextFound.bullet.evidence_ids = bullet.evidence_ids;
  nextFound.bullet.verification_status = 'supported';
  nextResult.review.needs_user_confirmation = [
    ...new Set([
      ...(nextResult.review.needs_user_confirmation || []),
      '单条描述已重新生成，请确认措辞是否符合实际情况',
    ]),
  ];

  const saved = await repository.updateGeneration(ctx, generationId, {
    status: 'edited',
    resultJson: nextResult,
  });
  await repository.replaceBullets(
    ctx,
    generationId,
    flattenBullets(nextResult)
  );
  return { generation: saved, bullet: nextFound.bullet };
}

async function regenerateExperience({
  repository,
  model,
  ctx,
  generationId,
  sourceExperienceId,
  userFeedback,
}) {
  const generation = await repository.getGeneration(ctx, generationId);
  if (!generation) {
    const error = new Error('生成记录不存在');
    error.statusCode = 404;
    throw error;
  }
  if (generation.status === 'confirmed') {
    const error = new Error('已确认的版本不能重新生成，请重新生成整套');
    error.statusCode = 409;
    throw error;
  }
  const result = generation.resultJson;
  const found = findExperience(result, sourceExperienceId);
  if (!found) {
    const error = new Error('经历不存在');
    error.statusCode = 404;
    throw error;
  }
  const experiences = generation.sourceSnapshot?.experiences || [];
  const source = experiences.find((item) => item.id === sourceExperienceId);
  if (!source) {
    const error = new Error('原始经历已不可用，无法重新生成');
    error.statusCode = 409;
    throw error;
  }

  const currentBullets = (found.experience.bullets || []).map((bullet) => ({
    text: bullet.text,
    evidence_ids: bullet.evidence_ids || [],
  }));
  const raw = await model.completeText({
    step: 'regenerate_experience',
    system: WRITER_SYSTEM_PROMPT,
    user: buildRegenerateExperiencePrompt({
      jobAnalysis:
        generation.sourceSnapshot?.job_analysis || result.job_analysis,
      experience: source,
      currentBullets,
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

  const bullets = Array.isArray(parsed?.bullets) ? parsed.bullets : [];
  const kind = source.kind;
  const draft =
    kind === 'employment'
      ? {
          work_experiences: [
            {
              source_experience_id: source.id,
              company: source.organization,
              position: source.title,
              bullets,
            },
          ],
          project_experiences: [],
          missing_requirements: [],
        }
      : {
          work_experiences: [],
          project_experiences: [
            {
              source_experience_id: source.id,
              project_name: source.data?.name || source.organization,
              tech_stack: source.data?.techStack || [],
              bullets,
            },
          ],
          missing_requirements: [],
        };

  const reviewed = reviewDraft({
    draft,
    retrieval: {
      summary: result.match_summary,
      partial: [],
      missing_requirements: result.missing_requirements || [],
    },
    experiences: [source],
  });
  const reviewedEntry =
    kind === 'employment'
      ? reviewed.work_experiences[0]
      : reviewed.project_experiences[0];
  if (!reviewedEntry || !(reviewedEntry.bullets || []).length) {
    const error = new Error(
      reviewed.review.unsupported_claims[0]?.reason ||
        '重新生成的内容未通过真实性检查'
    );
    error.statusCode = 422;
    error.code = 'UNSUPPORTED_CLAIM';
    error.details = reviewed.review.unsupported_claims;
    throw error;
  }

  const nextResult = JSON.parse(JSON.stringify(result));
  const nextFound = findExperience(nextResult, sourceExperienceId);
  nextFound.experience.bullets = reviewedEntry.bullets;
  nextResult.review.needs_user_confirmation = [
    ...new Set([
      ...(nextResult.review.needs_user_confirmation || []),
      '整段经历已重新生成，请确认措辞是否符合实际情况',
    ]),
  ];

  const saved = await repository.updateGeneration(ctx, generationId, {
    status: 'edited',
    resultJson: nextResult,
  });
  await repository.replaceBullets(
    ctx,
    generationId,
    flattenBullets(nextResult)
  );
  return {
    generation: saved,
    experience: findExperience(nextResult, sourceExperienceId)?.experience,
  };
}

module.exports = {
  flattenBullets,
  regenerateBullet,
  regenerateExperience,
};
