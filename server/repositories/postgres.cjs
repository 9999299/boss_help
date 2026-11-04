const { newId } = require('../ids.cjs');

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    let pg;
    try {
      pg = require('pg');
    } catch (error) {
      error.message =
        'DATABASE_URL is configured but the pg package is not installed';
      throw error;
    }
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      ssl:
        process.env.PGSSL === 'disable'
          ? false
          : { rejectUnauthorized: false },
    });
  }
  return pool;
}

function toJson(value) {
  return JSON.stringify(value == null ? null : value);
}

function fromRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    jobId: row.job_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    currentStep: row.current_step,
    steps: row.steps_json || [],
    input: row.input_json || {},
    error: row.error_json || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromGeneration(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    jobId: row.job_id,
    agentRunId: row.agent_run_id,
    versionNo: row.version_no,
    status: row.status,
    resultJson: row.result_json,
    sourceSnapshot: row.source_snapshot_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createPostgresRepository() {
  async function upsertCareerLibrary(ctx, experiences) {
    const db = getPool();
    const now = new Date().toISOString();
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const ids = experiences.map((item) => item.id);
      await client.query(
        `UPDATE career_experiences SET deleted_at = now(), updated_at = now()
         WHERE tenant_id = $1 AND user_id = $2 AND NOT (id = ANY($3::text[]))`,
        [ctx.tenantId, ctx.userId, ids]
      );
      for (const item of experiences) {
        await client.query(
          `INSERT INTO career_experiences
            (id, tenant_id, user_id, kind, organization, title, start_date, end_date,
             data, evidence, source, user_confirmed, deleted_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,NULL,now(),now())
           ON CONFLICT (tenant_id, user_id, id) DO UPDATE SET
             organization = EXCLUDED.organization,
             title = EXCLUDED.title,
             start_date = EXCLUDED.start_date,
             end_date = EXCLUDED.end_date,
             data = EXCLUDED.data,
             evidence = EXCLUDED.evidence,
             source = EXCLUDED.source,
             user_confirmed = EXCLUDED.user_confirmed,
             deleted_at = NULL,
             updated_at = now()`,
          [
            item.id,
            ctx.tenantId,
            ctx.userId,
            item.kind,
            item.organization || '',
            item.title || '',
            item.startDate || '',
            item.endDate || '',
            toJson(item.data || {}),
            toJson(item.evidence || []),
            item.source || 'user',
            item.userConfirmed === true,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return { experiences, updatedAt: now };
  }

  async function getCareerLibrary(ctx) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT * FROM career_experiences
       WHERE tenant_id = $1 AND user_id = $2 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [ctx.tenantId, ctx.userId]
    );
    return {
      experiences: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        organization: row.organization,
        title: row.title,
        startDate: row.start_date,
        endDate: row.end_date,
        data: row.data || {},
        evidence: row.evidence || [],
        source: row.source,
        userConfirmed: row.user_confirmed,
      })),
      updatedAt: rows[0]?.updated_at || null,
    };
  }

  async function upsertJob(ctx, job) {
    const db = getPool();
    const { rows } = await db.query(
      `INSERT INTO job_snapshots
        (id, tenant_id, user_id, source, external_url, title, company,
         description, analysis_json, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now(),now())
       ON CONFLICT (tenant_id, user_id, id) DO UPDATE SET
         title = EXCLUDED.title,
         company = EXCLUDED.company,
         description = EXCLUDED.description,
         analysis_json = EXCLUDED.analysis_json,
         updated_at = now()
       RETURNING *`,
      [
        job.id,
        ctx.tenantId,
        ctx.userId,
        job.source || 'boss',
        job.externalUrl || '',
        job.title || '',
        job.company || '',
        job.description || '',
        toJson(job.analysis || {}),
      ]
    );
    return rows[0] || null;
  }

  async function getJob(ctx, id) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT * FROM job_snapshots WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
      [id, ctx.tenantId, ctx.userId]
    );
    if (!rows[0]) return null;
    return {
      id: rows[0].id,
      source: rows[0].source,
      externalUrl: rows[0].external_url,
      title: rows[0].title,
      company: rows[0].company,
      description: rows[0].description,
      analysis: rows[0].analysis_json,
    };
  }

  async function createRun(ctx, data) {
    const db = getPool();
    const id = data.id || newId('run');
    try {
      const { rows } = await db.query(
        `INSERT INTO agent_runs
          (id, tenant_id, user_id, job_id, idempotency_key, status, current_step,
           steps_json, input_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,now(),now())
         RETURNING *`,
        [
          id,
          ctx.tenantId,
          ctx.userId,
          data.jobId,
          data.idempotencyKey,
          data.status || 'pending',
          data.currentStep || null,
          toJson(data.steps || []),
          toJson(data.input || {}),
        ]
      );
      return fromRun(rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        const existing = await findActiveRunByKey(
          ctx,
          data.jobId,
          data.idempotencyKey
        );
        if (existing) return existing;
      }
      throw error;
    }
  }

  async function findActiveRunByKey(ctx, jobId, idempotencyKey) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT * FROM agent_runs
       WHERE tenant_id = $1 AND user_id = $2 AND job_id = $3
         AND idempotency_key = $4 AND status IN ('pending','running')
       ORDER BY created_at DESC LIMIT 1`,
      [ctx.tenantId, ctx.userId, jobId, idempotencyKey]
    );
    return fromRun(rows[0]);
  }

  async function getRun(ctx, id) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT * FROM agent_runs WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
      [id, ctx.tenantId, ctx.userId]
    );
    return fromRun(rows[0]);
  }

  async function updateRun(ctx, id, patch) {
    const db = getPool();
    const existing = await getRun(ctx, id);
    if (!existing) return null;
    const next = { ...existing, ...patch };
    const { rows } = await db.query(
      `UPDATE agent_runs SET status = $4, current_step = $5, steps_json = $6::jsonb,
         input_json = $7::jsonb, error_json = $8::jsonb, updated_at = now()
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3 RETURNING *`,
      [
        id,
        ctx.tenantId,
        ctx.userId,
        next.status,
        next.currentStep || null,
        toJson(next.steps || []),
        toJson(next.input || {}),
        next.error ? toJson(next.error) : null,
      ]
    );
    return fromRun(rows[0]);
  }

  async function createGeneration(ctx, data) {
    const db = getPool();
    const id = data.id || newId('gen');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `${ctx.tenantId}:${ctx.userId}:${data.jobId}`,
      ]);
      const { rows } = await client.query(
        `SELECT COALESCE(MAX(version_no), 0) + 1 AS next_version
         FROM experience_generations WHERE tenant_id = $1 AND user_id = $2 AND job_id = $3`,
        [ctx.tenantId, ctx.userId, data.jobId]
      );
      const versionNo = Number(rows[0].next_version);
      const { rows: inserted } = await client.query(
        `INSERT INTO experience_generations
          (id, tenant_id, user_id, job_id, agent_run_id, version_no, status,
           result_json, source_snapshot_json, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,now(),now())
         RETURNING *`,
        [
          id,
          ctx.tenantId,
          ctx.userId,
          data.jobId,
          data.agentRunId,
          versionNo,
          data.status || 'draft',
          toJson(data.resultJson),
          toJson(data.sourceSnapshot || {}),
        ]
      );
      await client.query('COMMIT');
      return fromGeneration(inserted[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function getGeneration(ctx, id) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT * FROM experience_generations WHERE id = $1 AND tenant_id = $2 AND user_id = $3`,
      [id, ctx.tenantId, ctx.userId]
    );
    return fromGeneration(rows[0]);
  }

  async function getGenerationByRun(ctx, runId) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT * FROM experience_generations
       WHERE agent_run_id = $1 AND tenant_id = $2 AND user_id = $3
       ORDER BY created_at DESC LIMIT 1`,
      [runId, ctx.tenantId, ctx.userId]
    );
    return fromGeneration(rows[0]);
  }

  async function listGenerations(ctx, { jobId } = {}) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT id, tenant_id, user_id, job_id, agent_run_id, version_no, status,
              created_at, updated_at
       FROM experience_generations
       WHERE tenant_id = $1 AND user_id = $2 AND ($3::text IS NULL OR job_id = $3)
       ORDER BY created_at DESC`,
      [ctx.tenantId, ctx.userId, jobId || null]
    );
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      jobId: row.job_id,
      agentRunId: row.agent_run_id,
      versionNo: row.version_no,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async function updateGeneration(ctx, id, patch) {
    const db = getPool();
    const existing = await getGeneration(ctx, id);
    if (!existing) return null;
    const next = { ...existing, ...patch };
    const { rows } = await db.query(
      `UPDATE experience_generations SET status = $4, result_json = $5::jsonb,
         updated_at = now()
       WHERE id = $1 AND tenant_id = $2 AND user_id = $3 RETURNING *`,
      [
        id,
        ctx.tenantId,
        ctx.userId,
        next.status,
        toJson(next.resultJson),
      ]
    );
    return fromGeneration(rows[0]);
  }

  async function replaceBullets(ctx, generationId, items) {
    const db = getPool();
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `DELETE FROM experience_generation_bullets
         WHERE generation_id = $1 AND tenant_id = $2 AND user_id = $3`,
        [generationId, ctx.tenantId, ctx.userId]
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO experience_generation_bullets
            (id, generation_id, tenant_id, user_id, section, source_experience_id,
             claim_id, text, evidence_ids, verification_status, sort_order, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,now())`,
          [
            newId('bullet'),
            generationId,
            ctx.tenantId,
            ctx.userId,
            item.section,
            item.sourceExperienceId,
            item.claimId,
            item.text,
            toJson(item.evidenceIds || []),
            item.verificationStatus || 'supported',
            item.sortOrder || 0,
          ]
        );
      }
      await client.query('COMMIT');
      return { count: items.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function getBullet(ctx, generationId, claimId) {
    const db = getPool();
    const { rows } = await db.query(
      `SELECT * FROM experience_generation_bullets
       WHERE generation_id = $1 AND claim_id = $2 AND tenant_id = $3 AND user_id = $4`,
      [generationId, claimId, ctx.tenantId, ctx.userId]
    );
    if (!rows[0]) return null;
    return {
      claimId: rows[0].claim_id,
      text: rows[0].text,
      evidenceIds: rows[0].evidence_ids,
      verificationStatus: rows[0].verification_status,
      sourceExperienceId: rows[0].source_experience_id,
      section: rows[0].section,
    };
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
    updateGeneration,
    updateRun,
    upsertCareerLibrary,
    upsertJob,
    createGeneration,
    createRun,
    findActiveRunByKey,
  };
}

module.exports = { createPostgresRepository };
