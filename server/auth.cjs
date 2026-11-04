const crypto = require('crypto');

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64url(value) {
  return Buffer.from(String(value), 'base64url').toString('utf8');
}

function secret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (!globalThis.__jobpilotSessionSecret) {
    globalThis.__jobpilotSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalThis.__jobpilotSessionSecret;
}

function sign(payload) {
  return crypto
    .createHmac('sha256', secret())
    .update(payload)
    .digest('base64url');
}

function createSessionToken({ userId, tenantId, now = Date.now() }) {
  const payload = base64url(
    JSON.stringify({
      sub: userId,
      tid: tenantId,
      iat: now,
      exp: now + TOKEN_TTL_MS,
    })
  );
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token, now = Date.now()) {
  if (!token || typeof token !== 'string') {
    const error = new Error('缺少登录凭证');
    error.statusCode = 401;
    throw error;
  }
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    const error = new Error('登录凭证无效');
    error.statusCode = 401;
    throw error;
  }
  const expected = sign(payload);
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (
    actual.length !== wanted.length ||
    !crypto.timingSafeEqual(actual, wanted)
  ) {
    const error = new Error('登录凭证无效');
    error.statusCode = 401;
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(fromBase64url(payload));
  } catch {
    const error = new Error('登录凭证无效');
    error.statusCode = 401;
    throw error;
  }
  if (!parsed.sub || !parsed.tid || Number(parsed.exp) <= now) {
    const error = new Error('登录凭证已过期');
    error.statusCode = 401;
    throw error;
  }
  return {
    userId: String(parsed.sub),
    tenantId: String(parsed.tid),
    expiresAt: Number(parsed.exp),
  };
}

function newIdentity() {
  const userId = `user_${crypto.randomUUID()}`;
  return { userId, tenantId: `tenant_${userId}` };
}

function bearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function authenticate(req) {
  return verifySessionToken(bearerToken(req));
}

function issueSession(req, now = Date.now()) {
  let identity;
  try {
    identity = authenticate(req);
  } catch {
    identity = newIdentity();
  }
  return {
    ...identity,
    token: createSessionToken({ ...identity, now }),
    expiresAt: now + TOKEN_TTL_MS,
  };
}

module.exports = {
  TOKEN_TTL_MS,
  authenticate,
  createSessionToken,
  issueSession,
  newIdentity,
  verifySessionToken,
};
