import fs from 'node:fs';
import path from 'node:path';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node ua-arch-analyze.js <input.json> <output.json>');
  process.exit(1);
}

const knownPatterns = {
  routes: 'api', api: 'api', controllers: 'api', endpoints: 'api', handlers: 'api',
  services: 'service', core: 'service', lib: 'service', domain: 'service', logic: 'service',
  models: 'data', db: 'data', data: 'data', persistence: 'data', repository: 'data', entities: 'data',
  components: 'ui', views: 'ui', pages: 'ui', ui: 'ui', layouts: 'ui', screens: 'ui', app: 'ui',
  middleware: 'middleware', plugins: 'middleware', interceptors: 'middleware', guards: 'middleware',
  utils: 'utility', helpers: 'utility', common: 'utility', shared: 'utility', tools: 'utility',
  config: 'config', constants: 'config', env: 'config', settings: 'config',
  __tests__: 'test', test: 'test', tests: 'test', spec: 'test', specs: 'test',
  types: 'types', interfaces: 'types', schemas: 'types', contracts: 'types', dtos: 'types',
  hooks: 'hooks', store: 'state', state: 'state', reducers: 'state', actions: 'state', slices: 'state',
  assets: 'assets', static: 'assets', public: 'assets', migrations: 'data', docs: 'documentation',
  documentation: 'documentation', wiki: 'documentation', sql: 'data', database: 'data', schema: 'data'
};

function commonDirectoryPrefix(paths) {
  const parts = paths.map((item) => item.split('/').slice(0, -1));
  if (!parts.length) return [];
  const prefix = [];
  for (let index = 0; ; index += 1) {
    const candidate = parts[0][index];
    if (!candidate || !parts.every((segments) => segments[index] === candidate)) break;
    prefix.push(candidate);
  }
  return prefix;
}

function extensionPattern(node) {
  const name = node.filePath || node.name || '';
  if (/\.(test|spec)\./.test(name)) return 'test';
  if (/\.config\./.test(name) || node.type === 'config') return 'config';
  return path.extname(name).replace(/^\./, '') || 'root';
}

try {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const { fileNodes, importEdges, allEdges } = input;
  const nodeById = new Map(fileNodes.map((node) => [node.id, node]));
  const prefix = commonDirectoryPrefix(fileNodes.map((node) => node.filePath || node.name || ''));
  const directoryGroups = {};
  const groupOf = new Map();
  for (const node of fileNodes) {
    const segments = (node.filePath || node.name || '').split('/');
    const afterPrefix = segments.slice(prefix.length);
    const group = afterPrefix.length > 1 ? afterPrefix[0] : (segments.length > 1 ? segments[0] : extensionPattern(node));
    (directoryGroups[group] ||= []).push(node.id);
    groupOf.set(node.id, group);
  }
  const nodeTypeGroups = {};
  for (const node of fileNodes) (nodeTypeGroups[node.type] ||= []).push(node.id);
  const fanIn = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
  const fanOut = Object.fromEntries(fileNodes.map((node) => [node.id, 0]));
  const groupImports = new Map();
  const interGroup = new Map();
  const density = Object.fromEntries(Object.keys(directoryGroups).map((group) => [group, { internalEdges: 0, totalEdges: 0 }]));
  for (const edge of importEdges) {
    fanOut[edge.source] += 1;
    fanIn[edge.target] += 1;
    const from = groupOf.get(edge.source), to = groupOf.get(edge.target);
    if (!from || !to) continue;
    density[from].totalEdges += 1;
    density[to].totalEdges += 1;
    if (from === to) {
      density[from].internalEdges += 1;
    } else {
      groupImports.set(`${from}\u0000${to}`, (groupImports.get(`${from}\u0000${to}`) || 0) + 1);
      interGroup.set(`${from}\u0000${to}`, (interGroup.get(`${from}\u0000${to}`) || 0) + 1);
    }
  }
  const cross = new Map();
  for (const edge of allEdges) {
    const from = nodeById.get(edge.source), to = nodeById.get(edge.target);
    if (!from || !to) continue;
    const key = `${from.type}\u0000${to.type}\u0000${edge.type}`;
    cross.set(key, (cross.get(key) || 0) + 1);
  }
  const interGroupImports = [...interGroup.entries()].map(([key, count]) => {
    const [from, to] = key.split('\u0000'); return { from, to, count };
  });
  const intraGroupDensity = Object.fromEntries(Object.entries(density).map(([group, counts]) => [group, {
    ...counts, density: counts.totalEdges ? counts.internalEdges / counts.totalEdges : 0
  }]));
  const patternMatches = Object.fromEntries(Object.keys(directoryGroups).map((group) => [group, knownPatterns[group] || null]));
  const paths = fileNodes.map((node) => node.filePath || node.name || '');
  const isSql = (node) => /\.sql$/i.test(node.filePath || '');
  const deploymentFiles = paths.filter((file) => /(^|\/)(Dockerfile|docker-compose\..*|.*\.tf|.*\.tfvars|\.github\/workflows\/.*|\.gitlab-ci\.yml|Jenkinsfile)$/i.test(file));
  const dataPipeline = {
    schemaFiles: fileNodes.filter((node) => isSql(node) && !/\/migrations\//.test(node.filePath)).map((node) => node.filePath),
    migrationFiles: fileNodes.filter((node) => /\/migrations\/.*\.sql$/i.test(node.filePath || '')).map((node) => node.filePath),
    dataModelFiles: fileNodes.filter((node) => ['table', 'schema'].includes(node.type)).map((node) => node.filePath),
    apiHandlerFiles: fileNodes.filter((node) => /(^|\/)app\/api\/.*\/route\.js$/i.test(node.filePath || '')).map((node) => node.filePath)
  };
  const documented = new Set();
  for (const node of fileNodes.filter((node) => node.type === 'document')) {
    const file = node.filePath || '';
    const group = file.split('/')[0];
    if (directoryGroups[group]) documented.add(group);
    if (/README\.md$/i.test(file)) {
      const dir = file.split('/').slice(0, -1)[0];
      if (dir && directoryGroups[dir]) documented.add(dir);
    }
  }
  const dependencyDirection = [];
  const seenPairs = new Set();
  for (const { from, to } of interGroupImports) {
    const pair = [from, to].sort().join('\u0000');
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    const forward = groupImports.get(`${from}\u0000${to}`) || 0;
    const reverse = groupImports.get(`${to}\u0000${from}`) || 0;
    if (forward > reverse) dependencyDirection.push({ dependent: from, dependsOn: to });
    else if (reverse > forward) dependencyDirection.push({ dependent: to, dependsOn: from });
  }
  const results = {
    scriptCompleted: true,
    directoryGroups,
    nodeTypeGroups,
    crossCategoryEdges: [...cross.entries()].map(([key, count]) => {
      const [fromType, toType, edgeType] = key.split('\u0000'); return { fromType, toType, edgeType, count };
    }),
    interGroupImports,
    intraGroupDensity,
    patternMatches,
    deploymentTopology: {
      hasDockerfile: deploymentFiles.some((file) => /(^|\/)Dockerfile$/i.test(file)),
      hasCompose: deploymentFiles.some((file) => /docker-compose/i.test(file)),
      hasK8s: deploymentFiles.some((file) => /(^|\/)(k8s|kubernetes|helm|charts)\//i.test(file)),
      hasTerraform: deploymentFiles.some((file) => /\.tf(vars)?$/i.test(file)),
      hasCI: deploymentFiles.some((file) => /\.github\/workflows|\.gitlab-ci|Jenkinsfile/i.test(file)),
      infraFiles: deploymentFiles
    },
    dataPipeline,
    docCoverage: {
      groupsWithDocs: documented.size,
      totalGroups: Object.keys(directoryGroups).length,
      coverageRatio: Object.keys(directoryGroups).length ? documented.size / Object.keys(directoryGroups).length : 0,
      undocumentedGroups: Object.keys(directoryGroups).filter((group) => !documented.has(group))
    },
    dependencyDirection,
    fileStats: {
      totalFileNodes: fileNodes.length,
      filesPerGroup: Object.fromEntries(Object.entries(directoryGroups).map(([group, ids]) => [group, ids.length])),
      nodeTypeCounts: Object.fromEntries(Object.entries(nodeTypeGroups).map(([type, ids]) => [type, ids.length]))
    },
    fileFanIn: fanIn,
    fileFanOut: fanOut
  };
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
