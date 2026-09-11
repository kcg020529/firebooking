import fs from 'node:fs';

function fail(message) { console.error(message); process.exit(1); }
const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) fail('Usage: node ua-arch-analyze.js <input> <output>');

let raw;
try { raw = JSON.parse(fs.readFileSync(inputPath, 'utf8')); } catch (error) { fail(`Invalid input: ${error.message}`); }
const allowed = new Set(['file', 'config', 'document', 'service', 'pipeline', 'table', 'schema', 'resource', 'endpoint']);
const fileNodes = raw.fileNodes || (raw.nodes || []).filter((node) => allowed.has(node.type));
const allEdges = raw.allEdges || raw.edges || [];
const nodeIds = new Set(fileNodes.map((node) => node.id));
const importEdges = raw.importEdges || allEdges.filter((edge) => edge.type === 'imports' && nodeIds.has(edge.source) && nodeIds.has(edge.target));

function pathParts(node) { return (node.filePath || node.name || '').replaceAll('\\', '/').split('/').filter(Boolean); }
const paths = fileNodes.map(pathParts);
let common = paths.length ? [...paths[0]] : [];
for (const parts of paths.slice(1)) { while (common.length && parts[common.length - 1] !== undefined && !parts.slice(0, common.length).every((part, i) => part === common[i])) common.pop(); }
// A filename is never part of the common directory prefix.
if (common.length && common.every((part, i) => paths.every((p) => p[i] === part)) && paths.some((p) => p.length === common.length)) common.pop();
if (common.length && fileNodes.some((node) => (node.filePath || '').split('/').length === common.length)) common.pop();

function groupFor(node) {
  const parts = pathParts(node); const relative = parts.slice(common.length);
  return relative.length > 1 ? relative[0] : 'root';
}
const idToNode = new Map(fileNodes.map((node) => [node.id, node]));
const idToGroup = new Map(fileNodes.map((node) => [node.id, groupFor(node)]));
const directoryGroups = {};
const nodeTypeGroups = {};
for (const node of fileNodes) {
  (directoryGroups[groupFor(node)] ||= []).push(node.id);
  (nodeTypeGroups[node.type] ||= []).push(node.id);
}
const fanIn = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
const fanOut = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
const inter = new Map(); const involved = new Map(); const internal = new Map();
for (const edge of importEdges) {
  if (!(nodeIds.has(edge.source) && nodeIds.has(edge.target))) continue;
  fanOut[edge.source]++; fanIn[edge.target]++;
  const from = idToGroup.get(edge.source), to = idToGroup.get(edge.target);
  const key = `${from}\u0000${to}`; inter.set(key, (inter.get(key) || 0) + 1);
  involved.set(from, (involved.get(from) || 0) + 1); involved.set(to, (involved.get(to) || 0) + 1);
  if (from === to) internal.set(from, (internal.get(from) || 0) + 1);
}
const interGroupImports = [...inter].map(([key, count]) => { const [from, to] = key.split('\u0000'); return { from, to, count }; });
const intraGroupDensity = Object.fromEntries(Object.keys(directoryGroups).map((group) => [group, { internalEdges: internal.get(group) || 0, totalEdges: involved.get(group) || 0, density: involved.get(group) ? (internal.get(group) || 0) / involved.get(group) : 0 }]));
const patterns = { app: 'ui', components: 'ui', lib: 'service', test: 'test', tests: 'test', docs: 'documentation', supabase: 'data', scripts: 'utility', public: 'assets', '.github': 'ci-cd' };
const patternMatches = Object.fromEntries(Object.keys(directoryGroups).map((group) => [group, patterns[group] || (group === 'root' ? 'config' : 'unclassified')]));
const cross = new Map();
for (const edge of allEdges) {
  const source = idToNode.get(edge.source), target = idToNode.get(edge.target);
  if (!source || !target) continue;
  const key = `${source.type}\u0000${target.type}\u0000${edge.type}`;
  cross.set(key, (cross.get(key) || 0) + 1);
}
const crossCategoryEdges = [...cross].map(([key, count]) => { const [fromType, toType, edgeType] = key.split('\u0000'); return { fromType, toType, edgeType, count }; });
const pairCounts = new Map();
for (const { from, to, count } of interGroupImports) if (from !== to) pairCounts.set(`${from}\u0000${to}`, count);
const dependencyDirection = [];
for (const [key, count] of pairCounts) { const [from, to] = key.split('\u0000'); if (count > (pairCounts.get(`${to}\u0000${from}`) || 0)) dependencyDirection.push({ dependent: from, dependsOn: to }); }
const filePaths = fileNodes.map((node) => node.filePath || node.name || '');
const has = (pattern) => filePaths.some((path) => pattern.test(path));
const dataPipeline = {
  schemaFiles: filePaths.filter((path) => /schema\.sql$/i.test(path)),
  migrationFiles: filePaths.filter((path) => /migrations?\/.+\.sql$/i.test(path)),
  dataModelFiles: filePaths.filter((path) => /^(lib|supabase)\/.+\.(js|sql)$/i.test(path)),
  apiHandlerFiles: filePaths.filter((path) => /^app\/api\/.+\/route\.js$/i.test(path))
};
const docGroups = new Set(fileNodes.filter((node) => node.type === 'document').map(groupFor));
const results = {
  scriptCompleted: true, directoryGroups, nodeTypeGroups, crossCategoryEdges, interGroupImports, intraGroupDensity, patternMatches,
  deploymentTopology: { hasDockerfile: has(/(^|\/)Dockerfile/i), hasCompose: has(/docker-compose/i), hasK8s: has(/(^|\/)(k8s|kubernetes|helm)\//i), hasTerraform: has(/\.tf(vars)?$/i), hasCI: has(/(^|\/)(\.github\/workflows|\.gitlab-ci|Jenkinsfile)/i), infraFiles: filePaths.filter((path) => /Dockerfile|docker-compose|\.tf(vars)?$|(^|\/)(\.github\/workflows|k8s|kubernetes|helm)\//i.test(path)) },
  dataPipeline,
  docCoverage: { groupsWithDocs: docGroups.size, totalGroups: Object.keys(directoryGroups).length, coverageRatio: Object.keys(directoryGroups).length ? docGroups.size / Object.keys(directoryGroups).length : 0, undocumentedGroups: Object.keys(directoryGroups).filter((group) => !docGroups.has(group)) },
  dependencyDirection,
  fileStats: { totalFileNodes: fileNodes.length, filesPerGroup: Object.fromEntries(Object.entries(directoryGroups).map(([group, ids]) => [group, ids.length])), nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([type, ids]) => [type, ids.length])) },
  fileFanIn: fanIn, fileFanOut: fanOut
};
fs.writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`);
