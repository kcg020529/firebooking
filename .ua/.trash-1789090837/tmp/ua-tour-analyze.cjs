const fs = require('fs');

function byCountThenId(key) {
  return (a, b) => b[key] - a[key] || a.id.localeCompare(b.id);
}

try {
  const [inputPath, outputPath] = process.argv.slice(2);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const { nodes = [], edges = [], layers = [] } = input;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const fanIn = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  const fanOut = Object.fromEntries(nodes.map((node) => [node.id, 0]));
  const forward = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) continue;
    fanOut[edge.source] += 1;
    fanIn[edge.target] += 1;
    forward.get(edge.source).push(edge);
  }
  const rank = (counts, key) => nodes.map((node) => ({ id: node.id, [key]: counts[node.id], name: node.name })).sort(byCountThenId(key)).slice(0, 20);
  const fanInRanking = rank(fanIn, 'fanIn');
  const fanOutRanking = rank(fanOut, 'fanOut');
  const codeFiles = nodes.filter((node) => node.type === 'file');
  const highOutThreshold = [...new Set(codeFiles.map((node) => fanOut[node.id]).sort((a, b) => a - b))][Math.max(0, Math.ceil(codeFiles.length * 0.9) - 1)] ?? Infinity;
  const lowInThreshold = [...codeFiles.map((node) => fanIn[node.id]).sort((a, b) => a - b)][Math.max(0, Math.ceil(codeFiles.length * 0.25) - 1)] ?? -1;
  const nameMatches = new Set(['index.ts','index.js','main.ts','main.js','app.ts','app.js','server.ts','server.js','mod.rs','main.go','main.py','main.rs','manage.py','app.py','wsgi.py','asgi.py','run.py','__main__.py','Application.java','Main.java','Program.cs','config.ru','index.php','App.swift','Application.kt','main.cpp','main.c']);
  const entryPointCandidates = nodes.map((node) => {
    const path = node.filePath || '';
    const depth = path ? path.split('/').length : Infinity;
    let score = 0;
    if (node.type === 'document' && path === 'README.md') score += 5;
    else if (node.type === 'document' && depth === 1 && path.endsWith('.md')) score += 2;
    if (node.type === 'file') {
      if (nameMatches.has(node.name)) score += 3;
      if (depth <= 2) score += 1;
      if (fanOut[node.id] >= highOutThreshold) score += 1;
      if (fanIn[node.id] <= lowInThreshold) score += 1;
    }
    return { id: node.id, score, name: node.name, summary: node.summary };
  }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 5);
  const codeEntry = entryPointCandidates.find((candidate) => nodeById.get(candidate.id)?.type === 'file');
  const order = [], depthMap = {}, byDepth = {};
  if (codeEntry) {
    const queue = [codeEntry.id]; depthMap[codeEntry.id] = 0;
    while (queue.length) {
      const id = queue.shift(); order.push(id); const depth = depthMap[id];
      (byDepth[depth] ||= []).push(id);
      for (const edge of forward.get(id)) {
        if (!['imports', 'calls'].includes(edge.type) || depthMap[edge.target] !== undefined) continue;
        depthMap[edge.target] = depth + 1; queue.push(edge.target);
      }
    }
  }
  const nonCodeFiles = { documentation: [], infrastructure: [], data: [], config: [] };
  for (const node of nodes) {
    const item = { id: node.id, name: node.name, type: node.type, summary: node.summary };
    if (node.type === 'document') nonCodeFiles.documentation.push(item);
    else if (['service','pipeline','resource'].includes(node.type)) nonCodeFiles.infrastructure.push(item);
    else if (['table','schema','endpoint'].includes(node.type)) nonCodeFiles.data.push(item);
    else if (node.type === 'config') nonCodeFiles.config.push(item);
  }
  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  for (const edge of edges) if (['imports', 'calls'].includes(edge.type)) adjacency.get(edge.source)?.add(edge.target);
  const clusters = [];
  for (const [id, neighbors] of adjacency) for (const target of neighbors) if (id < target && adjacency.get(target)?.has(id)) {
    const members = new Set([id, target]); let changed = true;
    while (changed && members.size < 5) {
      changed = false;
      for (const [candidate, candidateNeighbors] of adjacency) {
        if (members.has(candidate)) continue;
        let links = 0; for (const member of members) if (candidateNeighbors.has(member) || adjacency.get(member)?.has(candidate)) links++;
        if (links >= 2 && members.size < 5) { members.add(candidate); changed = true; }
      }
    }
    let edgeCount = 0; for (const edge of edges) if (members.has(edge.source) && members.has(edge.target)) edgeCount++;
    clusters.push({ nodes: [...members].sort(), edgeCount });
  }
  clusters.sort((a,b) => b.edgeCount - a.edgeCount || a.nodes.join().localeCompare(b.nodes.join()));
  const nodeSummaryIndex = Object.fromEntries(nodes.map((node) => [node.id, { name: node.name, type: node.type, summary: node.summary }]));
  const result = { scriptCompleted: true, entryPointCandidates, fanInRanking, fanOutRanking, bfsTraversal: { startNode: codeEntry?.id || null, order, depthMap, byDepth }, nonCodeFiles, clusters: clusters.slice(0, 10), layers: { count: layers.length, list: layers.map(({ id, name, description }) => ({ id, name, description })) }, nodeSummaryIndex, totalNodes: nodes.length, totalEdges: edges.length };
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
