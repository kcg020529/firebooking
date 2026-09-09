import test from "node:test";
import assert from "node:assert/strict";
import AdminCatchAllPage from "../../app/admin/[...slug]/page.js";
import { recordUnauthorizedAdminAccess, recordAdminAccess } from "../../lib/security/authz.js";
import { isProtectedPagePath } from "../../lib/security/authPaths.js";

/**
 * 테스트용 가짜 Supabase 클라이언트 팩토리.
 * 테이블별 insert 호출 인자를 캡처한다.
 */
function createFakeSupabase(insertedRows) {
  return {
    from(tableName) {
      return {
        async insert(payload) {
          insertedRows.push({ table: tableName, data: payload });
          return { error: null };
        },
      };
    },
  };
}

test("1. AdminCatchAllPage 모듈을 직접 실행하면 Next.js notFound() 404 에러를 발생시킨다 (BLOCKER-1)", () => {
  assert.equal(typeof AdminCatchAllPage, "function", "AdminCatchAllPage는 함수여야 합니다.");

  // AdminCatchAllPage()를 실제 호출하여 Next.js notFound()가 올바르게 호출되는지 검증
  assert.throws(
    () => {
      AdminCatchAllPage();
    },
    (err) => {
      const is404 =
        err?.digest?.includes("NEXT_HTTP_ERROR_FALLBACK;404") ||
        err?.digest?.includes("404") ||
        err?.message?.includes("404") ||
        err?.__NEXT_ERROR_CODE === "E1041";
      assert.ok(is404, "에러는 Next.js 404 fallback 에러여야 합니다.");
      return true;
    },
    "AdminCatchAllPage() 호출 시 Next.js 404 에러가 발생해야 합니다.",
  );
});

test("2. recordUnauthorizedAdminAccess를 직접 실행하면 security_events와 audit_logs(deny)에 기록된다 (BLOCKER-1)", async () => {
  const insertedRows = [];
  const fakeSupabase = createFakeSupabase(insertedRows);

  const getIpHash = async () => "test-ip-hash-123";
  const runAfter = (fn) => fn(); // after() 지연 콜백을 동기 실행

  // 1) 미로그인 사용자 (guest)
  await recordUnauthorizedAdminAccess(
    { path: "/admin/xyz123", user: null },
    { getIpHash, getSupabase: () => fakeSupabase, runAfter },
  );

  const secEvent = insertedRows.find((r) => r.table === "security_events" && r.data.target_id === undefined);
  assert.ok(secEvent, "security_events 행이 추가되어야 합니다.");
  assert.equal(secEvent.data.rule_id, "AUTHZ_ADMIN");
  assert.equal(secEvent.data.category, "authz");
  assert.equal(secEvent.data.severity, "critical");
  assert.equal(secEvent.data.actor_id, null);
  assert.equal(secEvent.data.ip_hash, "test-ip-hash-123");
  assert.equal(secEvent.data.evidence, "guest 역할이 /admin/xyz123 접근 시도");

  const auditDeny = insertedRows.find((r) => r.table === "audit_logs" && r.data.result === "deny");
  assert.ok(auditDeny, "audit_logs deny 행이 추가되어야 합니다.");
  assert.equal(auditDeny.data.action, "admin.view");
  assert.equal(auditDeny.data.actor_role, "guest");
  assert.equal(auditDeny.data.target_type, "page");
  assert.equal(auditDeny.data.target_id, "/admin/xyz123");
  assert.equal(auditDeny.data.result, "deny");

  // 2) 일반 사용자 (role: 'user')
  insertedRows.length = 0;
  await recordUnauthorizedAdminAccess(
    { path: "/admin/config/database", user: { id: "user-uuid-1", role: "user" } },
    { getIpHash, getSupabase: () => fakeSupabase, runAfter },
  );

  const userSecEvent = insertedRows.find((r) => r.table === "security_events");
  assert.ok(userSecEvent);
  assert.equal(userSecEvent.data.actor_id, "user-uuid-1");
  assert.equal(userSecEvent.data.evidence, "user 역할이 /admin/config/database 접근 시도");

  const userAudit = insertedRows.find((r) => r.table === "audit_logs");
  assert.ok(userAudit);
  assert.equal(userAudit.data.actor_id, "user-uuid-1");
  assert.equal(userAudit.data.actor_role, "user");
  assert.equal(userAudit.data.target_id, "/admin/config/database");
  assert.equal(userAudit.data.result, "deny");
});

test("3. recordAdminAccess를 직접 실행하면 audit_logs(allow)에 정상 기록된다 (BLOCKER-1)", async () => {
  const insertedRows = [];
  const fakeSupabase = createFakeSupabase(insertedRows);

  const getIpHash = async () => "admin-ip-hash-456";
  const runAfter = (fn) => fn();

  await recordAdminAccess(
    { path: "/admin/xyz123", user: { id: "staff-uuid-1", role: "staff" } },
    { getIpHash, getSupabase: () => fakeSupabase, runAfter },
  );

  const auditAllow = insertedRows.find((r) => r.table === "audit_logs" && r.data.result === "allow");
  assert.ok(auditAllow, "audit_logs allow 행이 추가되어야 합니다.");
  assert.equal(auditAllow.data.actor_id, "staff-uuid-1");
  assert.equal(auditAllow.data.actor_role, "staff");
  assert.equal(auditAllow.data.action, "admin.view");
  assert.equal(auditAllow.data.target_type, "page");
  assert.equal(auditAllow.data.target_id, "/admin/xyz123");
  assert.equal(auditAllow.data.result, "allow");
  assert.equal(auditAllow.data.ip_hash, "admin-ip-hash-456");
});

test("4. 경로에 전화번호·개인정보가 포함되어도 마스킹되어 원문 PII가 로그에 남지 않는다 (IMPORTANT-1, BLOCKER-2b)", async () => {
  const insertedRows = [];
  const fakeSupabase = createFakeSupabase(insertedRows);

  const getIpHash = async () => "hash-pii";
  const runAfter = (fn) => fn();

  // 공격자가 경로 세그먼트에 전화번호 삽입 시도
  const piiPath = "/admin/user-010-1234-5678";
  await recordUnauthorizedAdminAccess(
    { path: piiPath, user: null },
    { getIpHash, getSupabase: () => fakeSupabase, runAfter },
  );

  const secEvent = insertedRows.find((r) => r.table === "security_events");
  const auditLog = insertedRows.find((r) => r.table === "audit_logs");

  // 원문 전화번호는 어디에도 저장되지 않아야 함
  assert.equal(secEvent.data.evidence.includes("010-1234-5678"), false, "원문 전화번호가 evidence에 남아서는 안 됩니다.");
  assert.ok(secEvent.data.evidence.includes("010-****-5678"), "마스킹된 전화번호가 포함되어야 합니다.");

  assert.equal(auditLog.data.target_id.includes("010-1234-5678"), false, "원문 전화번호가 target_id에 남아서는 안 됩니다.");
  assert.ok(auditLog.data.target_id.includes("010-****-5678"), "마스킹된 전화번호가 target_id에 저장되어야 합니다.");
});

test("5. 2000자 초과 무제한 길이 경로 요청 시 최대 200자로 안전하게 절단된다 (IMPORTANT-1)", async () => {
  const insertedRows = [];
  const fakeSupabase = createFakeSupabase(insertedRows);

  const getIpHash = async () => "hash-long";
  const runAfter = (fn) => fn();

  const excessivelyLongPath = `/admin/${"x".repeat(2000)}`;
  await recordUnauthorizedAdminAccess(
    { path: excessivelyLongPath, user: null },
    { getIpHash, getSupabase: () => fakeSupabase, runAfter },
  );

  const secEvent = insertedRows.find((r) => r.table === "security_events");
  const auditLog = insertedRows.find((r) => r.table === "audit_logs");

  assert.ok(secEvent.data.evidence.length <= 200, "evidence 길이는 200자 이하여야 합니다.");
  assert.ok(auditLog.data.target_id.length <= 200, "target_id 길이는 200자 이하여야 합니다.");
});

test("6. 미존재 관리자 경로를 보호 경로로 판별한다", () => {
  // lib/security/authPaths.js의 isProtectedPagePath() 단위 검사
  // 주의: proxy 자체를 실행하지 않으므로 실제 x-pathname 헤더 주입 실측은 미확인 항목으로 남긴다.
  assert.equal(isProtectedPagePath("/admin/xyz123"), true, "/admin/xyz123는 보호 경로여야 합니다.");
  assert.equal(isProtectedPagePath("/admin/config/database"), true, "/admin/config/database는 보호 경로여야 합니다.");
  assert.equal(isProtectedPagePath(`/admin/${"a".repeat(180)}`), true, "180자 경로도 보호 경로여야 합니다.");

  // 비관리자/공개 경로는 false 확인
  assert.equal(isProtectedPagePath("/"), false);
  assert.equal(isProtectedPagePath("/login"), false);
});

/**
 * 이 파일이 검증하지 않는 것 (RESULT-A1.md 의 미확인 항목과 같은 내용)
 *
 * - `guest` / `user` 의 미존재 경로 요청이 HTTP 200 거부 화면으로 나가는지.
 *   `app/admin/layout.js` 24~61행이 `!isStaff(user)` 일 때 `children` 을 렌더하지 않고
 *   거부 화면 JSX 를 반환하므로 코드 구조상 그렇게 동작하지만, `AdminLayout` 통합 실행이나
 *   실제 HTTP 요청으로 상태코드를 실측하지 않았다. 테스트로 검증했다고 주장하지 않는다.
 * - `staff` / `admin` 요청의 실제 HTTP 404 상태코드. 위 테스트는 페이지 컴포넌트가
 *   404 에러를 던지는 것까지만 확인하고, Next.js 가 그 에러를 404 응답으로 바꾸는 단계는 확인하지 않는다.
 * - proxy 가 주입하는 `x-pathname` 헤더가 catch-all 경로에서도 실제로 전달되는지.
 *   테스트 6은 `isProtectedPagePath()` 단위 동작만 확인한다.
 */
