import fs from 'node:fs';

try {
  const [graphPath, layersPath, outputPath] = process.argv.slice(2);
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const layers = JSON.parse(fs.readFileSync(layersPath, 'utf8'));
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !Array.isArray(layers)) {
    throw new Error('그래프 또는 레이어 형식이 올바르지 않습니다.');
  }
  fs.writeFileSync(outputPath, JSON.stringify({
    nodes: graph.nodes,
    edges: graph.edges,
    layers: layers.map(({ id, name, description }) => ({ id, name, description })),
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
