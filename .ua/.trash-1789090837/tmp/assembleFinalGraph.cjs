const fs = require('fs');

const [graphPath, scanPath, layersPath, tourPath, gitCommitHash] = process.argv.slice(2);
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const scan = JSON.parse(fs.readFileSync(scanPath, 'utf8'));
let layers = JSON.parse(fs.readFileSync(layersPath, 'utf8'));
let tour = JSON.parse(fs.readFileSync(tourPath, 'utf8'));

layers = Array.isArray(layers) ? layers : layers.layers || [];
tour = Array.isArray(tour) ? tour : tour.steps || [];

const nodeIds = new Set(graph.nodes.map((node) => node.id));
const prefixes = ['file:', 'config:', 'document:', 'service:', 'pipeline:', 'table:', 'schema:', 'resource:', 'endpoint:'];
const normalizeId = (id) => prefixes.some((prefix) => id.startsWith(prefix)) ? id : `file:${id}`;

layers = layers.map((layer) => {
  let ids = layer.nodeIds ?? layer.nodes ?? [];
  ids = ids.map((entry) => typeof entry === 'string' ? entry : entry.id).filter(Boolean);
  ids = ids.map(normalizeId).filter((id) => nodeIds.has(id));
  const id = layer.id || `layer:${String(layer.name || 'unnamed').toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '')}`;
  return { id, name: layer.name || id, description: layer.description || '설명 없음', nodeIds: ids };
});

tour = tour.map((step, index) => {
  let ids = step.nodeIds ?? step.nodesToInspect ?? [];
  ids = ids.map(normalizeId).filter((id) => nodeIds.has(id));
  const normalized = {
    order: Number.isInteger(step.order) ? step.order : index + 1,
    title: step.title || `단계 ${index + 1}`,
    description: step.description || step.whyItMatters || '설명 없음',
    nodeIds: ids,
  };
  if (typeof step.languageLesson === 'string') normalized.languageLesson = step.languageLesson;
  return normalized;
}).sort((a, b) => a.order - b.order);

const finalGraph = {
  version: '1.0.0',
  project: {
    name: scan.name,
    languages: scan.languages,
    frameworks: scan.frameworks,
    description: scan.description,
    analyzedAt: new Date().toISOString(),
    gitCommitHash,
  },
  nodes: graph.nodes,
  edges: graph.edges,
  layers,
  tour,
};

fs.writeFileSync(graphPath, JSON.stringify(finalGraph, null, 2) + '\n');
