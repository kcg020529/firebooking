import fs from 'node:fs';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) {
  console.error('Usage: node prepare-arch-input.js <assembled-graph.json> <input.json>');
  process.exit(1);
}

try {
  const graph = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const fileNodes = graph.nodes.filter((node) => node.type !== 'function');
  const fileIds = new Set(fileNodes.map((node) => node.id));
  const allEdges = graph.edges.filter((edge) => fileIds.has(edge.source) && fileIds.has(edge.target));
  const importEdges = allEdges.filter((edge) => edge.type === 'imports');
  fs.writeFileSync(outputPath, JSON.stringify({ fileNodes, importEdges, allEdges }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
