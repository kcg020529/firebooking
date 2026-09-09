import { notFound } from "next/navigation.js";

/**
 * A1: /admin/* 미존재 경로 탐지용 catch-all 페이지.
 *
 * 1. [...slug]를 사용하는 이유 (OPTIONAL-1):
 *    - [[...slug]](선택적 catch-all) 대신 [...slug]를 사용하여 /admin 인덱스 경로를
 *      침범하지 않고 app/admin/page.js가 정상적으로 최우선 매칭되도록 보장한다.
 * 2. 부모 layout의 dynamic 설정 상속 (OPTIONAL-2):
 *    - app/admin/layout.js의 `export const dynamic = "force-dynamic"`을 상속받으므로,
 *      빌드 시 정적으로 프리렌더되지 않고 매 요청마다 layout의 권한 검사를 거친 후
 *      notFound()를 호출한다.
 * 3. 권한 검사 통과 후 404 반환:
 *    - Next.js App Router는 매칭 페이지가 없으면 layout을 건너뛰고 루트 404로 직행하지만,
 *      이 페이지가 라우트 트리에 존재함으로써 모든 미존재 경로가 admin layout을 거치게 된다.
 *    - 권한 검사가 완료된 요청에 대해 Next.js 표준 notFound()를 호출하여 최종 404 응답을 반환한다.
 */
export default function AdminCatchAllPage() {
  notFound();
}
