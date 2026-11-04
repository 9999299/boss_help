const { createMemoryRepository } = require('./memory.cjs');
const { createPostgresRepository } = require('./postgres.cjs');

let shared;

function createRepository() {
  if (process.env.DATABASE_URL) return createPostgresRepository();
  return createMemoryRepository();
}

function getRepository() {
  if (!shared) shared = createRepository();
  return shared;
}

function setRepository(repository) {
  shared = repository;
}

module.exports = { createRepository, getRepository, setRepository };
