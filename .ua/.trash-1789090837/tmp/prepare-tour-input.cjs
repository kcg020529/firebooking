const fs = require('fs');

const [graphPath, layersPath, outputPath] = process.argv.slice(2);
try {
  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  const layers = JSON.parse(fs.readFileSync(layersPath, 'utf8')).map(({ id, name, description }) => ({ id, name, description }));
  fs.writeFileSync(outputPath, JSON.stringify({ nodes: graph.nodes, edges: graph.edges, layers }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
