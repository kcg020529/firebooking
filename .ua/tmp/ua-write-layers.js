import fs from 'node:fs';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error('Usage: node ua-write-layers.js <input.json> <layers.json>');
  process.exit(1);
}

try {
  const { fileNodes } = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const definitions = [
    ['layer:ui', 'UI 레이어', 'Next.js App Router 페이지, 관리자 화면, 예약·리뷰 화면과 재사용 React 컴포넌트로 사용자 경험을 구성한다.'],
    ['layer:api', 'API 레이어', '예약, 챗봇, 인증, 관리자 모니터링 및 코스 리뷰 REST API 요청을 검증하고 서버 서비스로 전달한다.'],
    ['layer:service', 'Service 레이어', '예약·리뷰·코스·챗봇과 Supabase 연동, PII·접근 제어·보안 감사 및 관리자 데이터 집계를 처리한다.'],
    ['layer:data', '데이터 레이어', 'Supabase 예약·리뷰·보안 로그 스키마, RLS 정책, 시드와 로그인·리뷰 마이그레이션을 관리한다.'],
    ['layer:middleware', 'middleware 레이어', '보호 경로의 Supabase 세션을 갱신하고 유휴 세션 만료를 적용한다.'],
    ['layer:test', '테스트 레이어', '예약, 챗봇, 리뷰, 인증과 보안 탐지·로그 처리의 단위 및 통합 동작을 검증한다.'],
    ['layer:documentation', '문서 레이어', '프로젝트 사용법, 아키텍처, 보안 정책, 데이터 흐름 및 협업 절차를 기록한다.'],
    ['layer:config', '설정 및 프로젝트 지원 레이어', 'Next.js·Tailwind·배포 환경 설정, 소유자 규칙과 데이터·문서 유지보수 스크립트를 제공한다.']
  ];
  const layers = definitions.map(([id, name, description]) => ({ id, name, description, nodeIds: [] }));
  const layerById = new Map(layers.map((layer) => [layer.id, layer]));
  const assign = (id, node) => layerById.get(id).nodeIds.push(node.id);

  for (const node of fileNodes) {
    const file = node.filePath || '';
    if (file.startsWith('app/api/')) assign('layer:api', node);
    else if (node.type === 'table') assign('layer:data', node);
    else if (file === 'proxy.js') assign('layer:middleware', node);
    else if (file.startsWith('test/')) assign('layer:test', node);
    else if (node.type === 'document') assign('layer:documentation', node);
    else if (file.startsWith('lib/') || ['app/admin/metricsData.js', 'app/admin/useAdminResource.js'].includes(file)) assign('layer:service', node);
    else if (file.startsWith('app/') || file.startsWith('components/')) assign('layer:ui', node);
    else assign('layer:config', node);
  }

  const assigned = layers.flatMap((layer) => layer.nodeIds);
  const unique = new Set(assigned);
  if (layers.some((layer) => layer.nodeIds.length === 0) || assigned.length !== fileNodes.length || unique.size !== fileNodes.length) {
    throw new Error(`Invalid layer membership: ${assigned.length} assignments, ${unique.size} unique IDs, ${fileNodes.length} input nodes`);
  }
  fs.writeFileSync(outputPath, JSON.stringify(layers, null, 2));
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
