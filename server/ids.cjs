const crypto = require('crypto');

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function stableHash(value) {
  return crypto
    .createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

module.exports = { newId, stableHash };
