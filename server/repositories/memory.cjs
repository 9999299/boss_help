const { newId } = require('../ids.cjs');

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function key(ctx, id) {
  return `${ctx.tenantId}\u0000${ctx.userId}\u0000${id}`;
}

function createMemoryRepository() {
  const libraries = new Map();
  const jobs = new Map();
  const runs = new Map();
  const generations = new Map();
  const bullets = new Map();

  async function upsertCareerLibrary(ctx, experiences) {
    const previous = libraries.get(key(ctx, 'library')) || { experiences: [] };
    const now = new Date().toISOString();
    const incomingIds = new Set(experiences.map((item) => item.id));
    const retained = previous.experiences
      .filter((item) => !incomingIds.has(item.id))
      .map((item) => ({ ...item, deletedAt: now }));
    const next = {
      experiences: [...retained, ...clone(experiences)],
      updatedAt: now,
    };
    libraries.set(key(ctx, 'library'), next);
    return clone(next);
  }

  async function getCareerLibrary(ctx) {
    const doc = libraries.get(key(ctx, 'library'));
    if (!doc) return { experiences: [], updatedAt: null };
    return clone({
      ...doc,
      experiences: doc.experiences.filter((item) => !item.deletedAt),
    });
  }

  async function upsertJob(ctx, job) {
    const now = new Date().toISOString();
    const existing = jobs.get(key(ctx, job.id));
    const doc = {
      ...(existing || {}),
      ...clone(job),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    jobs.set(key(ctx, job.id), doc);
    return clone(doc);
  }

  async function getJob(ctx, id) {
    return clone(jobs.get(key(ctx, id)) || null);
  }

  async function createRun(ctx, data) {
    const now = new Date().toISOString();
    const doc = {
      ...clone(data),
      id: data.id || newId('run'),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      status: data.status || 'pending',
      currentStep: data.currentStep || null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    runs.set(key(ctx, doc.id), doc);
    return clone(doc);
  }

  async function findActiveRunByKey(ctx, jobId, idempotencyKey) {
    const found = [...runs.values()].find(
      (run) =>
        run.tenantId === ctx.tenantId &&
        run.userId === ctx.userId &&
        run.jobId === jobId &&
        run.idempotencyKey === idempotencyKey &&
        ['pending', 'running'].includes(run.status)
    );
    return clone(found || null);
  }

  async function getRun(ctx, id) {
    return clone(runs.get(key(ctx, id)) || null);
  }

  async function updateRun(ctx, id, patch) {
    const k = key(ctx, id);
    const existing = runs.get(k);
    if (!existing) return null;
    const next = {
      ...existing,
      ...clone(patch),
      updatedAt: new Date().toISOString(),
    };
    runs.set(k, next);
    return clone(next);
  }

  async function createGeneration(ctx, data) {
    const now = new Date().toISOString();
    const sameJob = [...generations.values()].filter(
      (item) =>
        item.tenantId === ctx.tenantId &&
        item.userId === ctx.userId &&
        item.jobId === data.jobId
    );
    const versionNo =
      sameJob.reduce((max, item) => Math.max(max, Number(item.versionNo) || 0), 0) + 1;
    const doc = {
      ...clone(data),
      id: data.id || newId('gen'),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      versionNo,
      status: data.status || 'draft',
      createdAt: now,
      updatedAt: now,
    };
    generations.set(key(ctx, doc.id), doc);
    return clone(doc);
  }

  async function getGeneration(ctx, id) {
    return clone(generations.get(key(ctx, id)) || null);
  }

  async function getGenerationByRun(ctx, runId) {
    const found = [...generations.values()].find(
      (item) =>
        item.tenantId === ctx.tenantId &&
        item.userId === ctx.userId &&
        item.agentRunId === runId
    );
    return clone(found || null);
  }

  async function listGenerations(ctx, { jobId } = {}) {
    return clone(
      [...generations.values()]
        .filter(
          (item) =>
            item.tenantId === ctx.tenantId &&
            item.userId === ctx.userId &&
            (!jobId || item.jobId === jobId)
        )
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(({ resultJson, sourceSnapshot, ...meta }) => meta)
    );
  }

  async function updateGeneration(ctx, id, patch) {
    const k = key(ctx, id);
    const existing = generations.get(k);
    if (!existing) return null;
    const next = {
      ...existing,
      ...clone(patch),
      updatedAt: new Date().toISOString(),
    };
    generations.set(k, next);
    return clone(next);
  }

  async function replaceBullets(ctx, generationId, items) {
    for (const [k, bullet] of bullets.entries()) {
      if (bullet.generationId === generationId) bullets.delete(k);
    }
    for (const item of items) {
      const doc = {
        ...clone(item),
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        generationId,
      };
      bullets.set(key(ctx, `${generationId}:${item.claimId}`), doc);
    }
    return { count: items.length };
  }

  async function getBullet(ctx, generationId, claimId) {
    return clone(
      bullets.get(key(ctx, `${generationId}:${claimId}`)) || null
    );
  }

  async function reset() {
    libraries.clear();
    jobs.clear();
    runs.clear();
    generations.clear();
    bullets.clear();
  }

  return {
    getBullet,
    getCareerLibrary,
    getGeneration,
    getGenerationByRun,
    getJob,
    getRun,
    listGenerations,
    replaceBullets,
    reset,
    updateGeneration,
    updateRun,
    upsertCareerLibrary,
    upsertJob,
    createGeneration,
    createRun,
    findActiveRunByKey,
  };
}

module.exports = { createMemoryRepository };
