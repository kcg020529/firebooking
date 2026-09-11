const fs = require('fs');

const [projectRoot, assembledPath, graphPath, scanPath, fingerprintInputPath, gitCommitHash] = process.argv.slice(2);
const scan = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
fs.copyFileSync(assembledPath, graphPath);
fs.writeFileSync(fingerprintInputPath, JSON.stringify({
  projectRoot,
  filePaths: scan.files.map((file) => file.path),
  gitCommitHash,
}, null, 2) + '\n');
