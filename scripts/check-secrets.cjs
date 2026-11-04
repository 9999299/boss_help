const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\btp-[A-Za-z0-9_-]{20,}\b/g,
];

function findSecrets(content) {
  const matches = [];
  for (const pattern of SECRET_PATTERNS) {
    const found = String(content).match(pattern);
    if (found) matches.push(...found);
  }
  return [...new Set(matches)];
}

function walk(target, files = []) {
  if (!fs.existsSync(target)) return files;
  const stat = fs.statSync(target);
  if (stat.isFile()) return files.concat(target);
  for (const entry of fs.readdirSync(target)) {
    if (['node_modules', '.git', '.vercel'].includes(entry)) continue;
    files = walk(path.join(target, entry), files);
  }
  return files;
}

function main() {
  const root = process.cwd();
  const targets = ['src', 'api', 'public', 'scripts', 'dist', 'webpack.config.cjs', 'package.json'];
  const hits = [];
  for (const target of targets.flatMap((item) => walk(path.join(root, item)))) {
    try {
      const content = fs.readFileSync(target, 'utf8');
      const secrets = findSecrets(content);
      secrets.forEach((secret) => hits.push({ file: path.relative(root, target), secret }));
    } catch {
      // Ignore unreadable/binary files.
    }
  }
  if (hits.length) {
    hits.forEach((hit) => console.error(`Potential secret in ${hit.file}: ${hit.secret.slice(0, 6)}…`));
    process.exitCode = 1;
  } else {
    console.log('No API key patterns found.');
  }
}

module.exports = { findSecrets };
if (require.main === module) main();
