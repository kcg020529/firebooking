const fs = require('fs');

const [metaPath, scanPath, gitCommitHash] = process.argv.slice(2);
const scan = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
fs.writeFileSync(metaPath, JSON.stringify({
  lastAnalyzedAt: new Date().toISOString(),
  gitCommitHash,
  version: '1.0.0',
  analyzedFiles: scan.files.length,
}, null, 2) + '\n');
