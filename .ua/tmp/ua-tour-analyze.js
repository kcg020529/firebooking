import fs from 'node:fs';

try {
  const [inputPath, outputPath] = process.argv.slice(2);
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const { nodes, edges, layers } = input;
  if (!Array.isArray(nodes) || !Array.isArray(edges) || !Array.isArray(layers)) throw new Error('입력 형식이 올바르지 않습니다.');
  const byId = new Map(nodes.map(n => [n.id, n]));
  const fanIn = new Map(nodes.map(n => [n.id, 0]));
  const fanOut = new Map(nodes.map(n => [n.id, 0]));
  const forward = new Map(nodes.map(n => [n.id, []]));
  const pairEdges = new Map();
  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    fanOut.set(edge.source, fanOut.get(edge.source) + 1);
    fanIn.set(edge.target, fanIn.get(edge.target) + 1);
    if (edge.type === 'imports' || edge.type === 'calls') forward.get(edge.source).push(edge.target);
    const key = `${edge.source}\u0000${edge.target}`;
    pairEdges.set(key, (pairEdges.get(key) || 0) + 1);
  }
  const ranked = (metric, key) => nodes.map(n => ({ id: n.id, [key]: metric.get(n.id), name: n.name }))
    .sort((a,b) => b[key] - a[key] || a.id.localeCompare(b.id)).slice(0,20);
  const outValues = [...fanOut.values()].sort((a,b) => a-b);
  const inValues = [...fanIn.values()].sort((a,b) => a-b);
  const highOut = outValues[Math.max(0, Math.ceil(outValues.length * .9) - 1)];
  const lowIn = inValues[Math.max(0, Math.ceil(inValues.length * .25) - 1)];
  const filenameRE = /^(index|main|app|server)\.(ts|js)$|^(mod|main)\.rs$|^main\.(go|py|cpp|c)$|^(manage|app|wsgi|asgi|run)\.py$|^__main__\.py$|^(Application\.java|Main\.java|Program\.cs|config\.ru|index\.php|App\.swift|Application\.kt)$/;
  const depth = file => (file || '').split('/').length - 1;
  const candidates = nodes.map(n => {
    let score = 0;
    const path = n.filePath || '';
    if (n.type === 'document' && path === 'README.md') score += 5;
    else if (n.type === 'document' && path.endsWith('.md') && depth(path) === 0) score += 2;
    if (n.type === 'file') {
      if (filenameRE.test(n.name || '')) score += 3;
      if (depth(path) <= 1) score += 1;
      if (fanOut.get(n.id) >= highOut) score += 1;
      if (fanIn.get(n.id) <= lowIn) score += 1;
    }
    return { id:n.id, score, name:n.name, summary:n.summary };
  }).filter(x => x.score > 0).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id)).slice(0,5);
  const start = candidates.find(c => byId.get(c.id)?.type === 'file')?.id || null;
  const depthMap = {}, order = [], byDepth = {};
  if (start) {
    const queue = [start]; depthMap[start] = 0;
    for (let i=0; i<queue.length; i++) {
      const current = queue[i], d = depthMap[current]; order.push(current);
      (byDepth[d] ||= []).push(current);
      for (const target of forward.get(current) || []) if (depthMap[target] === undefined) { depthMap[target] = d+1; queue.push(target); }
    }
  }
  const categories = { documentation:[], infrastructure:[], data:[], config:[] };
  for (const n of nodes) {
    const value = {id:n.id, name:n.name, type:n.type, summary:n.summary};
    if (n.type === 'document') categories.documentation.push(value);
    if (['service','pipeline','resource'].includes(n.type)) categories.infrastructure.push(value);
    if (['table','schema','endpoint'].includes(n.type)) categories.data.push(value);
    if (n.type === 'config') categories.config.push(value);
  }
  const clusters = [], seen = new Set();
  for (const edge of edges) {
    if (!['imports','calls'].includes(edge.type)) continue;
    const reverse = edges.some(e => e.source === edge.target && e.target === edge.source && ['imports','calls'].includes(e.type));
    if (!reverse) continue;
    const seed = [edge.source, edge.target].sort(); const signature = seed.join('\u0000');
    if (seen.has(signature)) continue; seen.add(signature);
    const members = new Set(seed); let changed = true;
    while (changed && members.size < 5) {
      changed = false;
      for (const n of nodes) {
        if (members.has(n.id)) continue;
        const links = edges.filter(e => (e.source === n.id && members.has(e.target)) || (e.target === n.id && members.has(e.source))).length;
        if (links >= 2) { members.add(n.id); changed = true; if (members.size >= 5) break; }
      }
    }
    const nodeIds = [...members];
    const edgeCount = edges.filter(e => nodeIds.includes(e.source) && nodeIds.includes(e.target)).length;
    clusters.push({nodes:nodeIds, edgeCount});
  }
  const uniqueClusters = [...new Map(clusters.map(c => [c.nodes.slice().sort().join('\u0000'), c])).values()]
    .sort((a,b) => b.edgeCount-a.edgeCount).slice(0,10);
  const index = Object.fromEntries(nodes.map(n => [n.id, {name:n.name, type:n.type, summary:n.summary}]));
  fs.writeFileSync(outputPath, JSON.stringify({scriptCompleted:true, entryPointCandidates:candidates,
    fanInRanking:ranked(fanIn,'fanIn'), fanOutRanking:ranked(fanOut,'fanOut'),
    bfsTraversal:{startNode:start, order, depthMap, byDepth}, nonCodeFiles:categories, clusters:uniqueClusters,
    layers:{count:layers.length,list:layers.map(({id,name,description})=>({id,name,description}))}, nodeSummaryIndex:index,
    totalNodes:nodes.length,totalEdges:edges.length}, null, 2));
} catch (error) { console.error(error.stack || error.message); process.exit(1); }
