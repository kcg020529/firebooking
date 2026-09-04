/**
 * 페이지 진입 전에 세션을 원격 검증·갱신해야 하는 보호 경로인가.
 * API는 각 Route Handler가 필요한 권한을 직접 검증한다.
 */
export function isProtectedPagePath(path) {
  return (
    path === "/my" ||
    path.startsWith("/my/") ||
    path === "/admin" ||
    path.startsWith("/admin/")
  );
}
