const { createV1Handler } = require('../../server/api/v1.cjs');
const { getRepository } = require('../../server/repositories/index.cjs');

let waitUntil;
try {
  ({ waitUntil } = require('@vercel/functions'));
} catch {
  waitUntil = undefined;
}

module.exports = createV1Handler({
  repository: getRepository(),
  waitUntil,
});
