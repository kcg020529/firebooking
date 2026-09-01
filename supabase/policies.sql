-- ============================================================
--  firebooking · RLS 정책
--  schema.sql 실행 후에 이어서 실행한다.
--
--  이 파일이 이 과제에서 가장 중요한 파일이다.
--  "앱에서 화면만 가린 게 아니라 DB가 거절한다"를 증명하는 근거다.
-- ============================================================
--
--  ⚠️ 읽기 전에 알아야 할 두 가지
--
--  1. service_role(= sb_secret_ 키)은 RLS를 완전히 우회한다.
--     서버(API Route)는 이 키를 쓰므로 아래 정책의 영향을 받지 않는다.
--     아래 정책은 anon(= sb_publishable_ 키)과 로그인 사용자에게만 적용된다.
--     → 즉 "브라우저에서 직접 DB를 찌를 때" 무엇이 막히는지를 정의한다.
--
--  2. 거절의 형태가 두 가지다. 시연 때 구분해서 보여줘야 한다.
--       · GRANT 자체가 없으면  → 401 "permission denied for table ..."
--       · GRANT 는 있고 RLS 가 행을 거르면 → 200 + 빈 배열 []
--     즉 로그인 사용자가 보안 로그를 조회하면 에러가 아니라 []가 온다.
--     403을 기대하면 "안 막힌 거 아니냐"고 오해한다. 막혔다는 증거는 "행이 0개"다.
--     (INSERT/UPDATE/DELETE 가 막히면 그때는 401/403 에러가 뜬다)
--
-- ============================================================


-- ────────────────────────────────────────────────────────────
--  1. 8개 테이블 전부 RLS 활성화
--  정책을 하나도 안 만들면 그 테이블은 anon에게 완전 차단된다.
--  "열려있다가 까먹고 못 막는 것"보다 "막혀있다가 필요한 만큼 여는 것"이 안전하다.
-- ────────────────────────────────────────────────────────────

alter table public.courses         enable row level security;
alter table public.slots           enable row level security;
alter table public.bookings        enable row level security;
alter table public.profiles        enable row level security;
alter table public.api_logs        enable row level security;
alter table public.audit_logs      enable row level security;
alter table public.security_events enable row level security;
alter table public.chat_logs       enable row level security;


-- ────────────────────────────────────────────────────────────
--  2. 테이블 권한 (GRANT) — RLS 앞에 있는 첫 번째 관문
--
--  Postgres 접근 제어는 두 겹이다.
--    ① GRANT — 테이블 단위. "이 역할이 이 테이블을 건드릴 수 있는가"
--    ② RLS   — 행 단위.     "그중 어떤 행을 볼 수 있는가"
--  ①이 없으면 ②까지 가보지도 못하고 401 permission denied 로 끊긴다.
--
--  프로젝트 생성 때 "Automatically expose new tables"를 껐기 때문에
--  새 테이블에는 GRANT 가 자동으로 붙지 않는다. 여기서 명시적으로 준다.
--  ⚠️ 앞으로 테이블을 추가하면 이 블록에도 한 줄 추가해야 한다.
-- ────────────────────────────────────────────────────────────

-- 공개 목록 — 비로그인도 읽는다
grant select on public.courses to anon, authenticated;
grant select on public.slots   to anon, authenticated;

-- 로그인 사용자에게만 테이블을 열고, 실제로 보이는 행은 RLS 가 고른다.
-- anon 에게는 GRANT 를 주지 않아 401 로 끊는다.
grant select on public.bookings        to authenticated;
grant select on public.profiles        to authenticated;
grant select on public.api_logs        to authenticated;
grant select on public.audit_logs      to authenticated;
grant select on public.security_events to authenticated;
grant select on public.chat_logs       to authenticated;

-- INSERT · UPDATE · DELETE 는 어느 역할에도 주지 않는다.
-- 쓰기는 전부 서버(service_role)를 거친다.


-- ────────────────────────────────────────────────────────────
--  3. 공개 읽기 — courses · slots
--  골프장 목록과 예약 가능 시간은 로그인 없이도 봐야 한다.
--  쓰기 정책은 만들지 않는다 → 서버(service_role)만 쓸 수 있다.
-- ────────────────────────────────────────────────────────────

drop policy if exists courses_public_read on public.courses;
create policy courses_public_read
  on public.courses
  for select
  to anon, authenticated
  using (true);

drop policy if exists slots_public_read on public.slots;
create policy slots_public_read
  on public.slots
  for select
  to anon, authenticated
  using (true);


-- ────────────────────────────────────────────────────────────
--  4. bookings — 원본 PII가 있는 테이블
--
--  anon: 아무것도 못 읽는다. 정책이 없으므로 완전 차단.
--        비로그인 예약 조회는 서버가 예약번호·전화번호를 대조한 뒤
--        service_role 로 꺼내준다. 브라우저가 직접 뒤질 수 없다.
--  로그인 사용자: 자기 예약만.
--  staff/admin: 전부.
--
--  INSERT 정책 없음 → 브라우저에서 직접 예약 생성 불가.
--  반드시 서버의 createBooking() 을 거쳐야 한다
--  (거기서 인젝션 탐지 · PII 마스킹 · 감사 기록이 붙는다).
-- ────────────────────────────────────────────────────────────

drop policy if exists bookings_owner_read on public.bookings;
create policy bookings_owner_read
  on public.bookings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists bookings_staff_read on public.bookings;
create policy bookings_staff_read
  on public.bookings
  for select
  to authenticated
  using (public.is_staff());


-- ────────────────────────────────────────────────────────────
--  5. profiles — 역할 정보
--  자기 행은 읽을 수 있고, staff/admin 은 전부 읽는다.
--
--  ⚠️ 역할 변경(UPDATE) 정책은 일부러 만들지 않았다.
--     사용자가 스스로 role 을 'admin' 으로 바꾸는 권한 상승을 막기 위해서다.
--     승격은 SQL Editor 또는 서버 코드(service_role)로만 한다.
-- ────────────────────────────────────────────────────────────

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_staff_read on public.profiles;
create policy profiles_staff_read
  on public.profiles
  for select
  to authenticated
  using (public.is_staff());


-- ────────────────────────────────────────────────────────────
--  6. 보안 로그 4종 — staff/admin 만 읽기
--
--  일반 user 계정으로 이 테이블들을 직접 조회하면 빈 배열이 온다.
--  시연 5번("권한 외 접근")에서 보여줄 지점.
--
--  INSERT 정책 없음 → 로그는 서버만 쓴다.
--  UPDATE/DELETE 정책 없음 → 아무도 로그를 지우거나 고칠 수 없다.
--  감사 로그가 사후 조작 가능하면 감사 로그가 아니다.
-- ────────────────────────────────────────────────────────────

drop policy if exists api_logs_staff_read on public.api_logs;
create policy api_logs_staff_read
  on public.api_logs
  for select
  to authenticated
  using (public.is_staff());

drop policy if exists audit_logs_staff_read on public.audit_logs;
create policy audit_logs_staff_read
  on public.audit_logs
  for select
  to authenticated
  using (public.is_staff());

drop policy if exists security_events_staff_read on public.security_events;
create policy security_events_staff_read
  on public.security_events
  for select
  to authenticated
  using (public.is_staff());

drop policy if exists chat_logs_staff_read on public.chat_logs;
create policy chat_logs_staff_read
  on public.chat_logs
  for select
  to authenticated
  using (public.is_staff());


-- ────────────────────────────────────────────────────────────
--  7. 함수 실행 권한
--
--  create_booking() 은 security definer 라 RLS를 우회한다.
--  브라우저가 직접 호출할 수 있으면 서버의 검증
--  (인젝션 탐지 · PII 마스킹 · 감사 기록)을 통째로 건너뛰게 된다.
--  → 실행 권한을 회수한다. 서버만 호출.
--
--  ⚠️ PUBLIC 부터 회수해야 한다.
--     Postgres 는 새 함수에 PUBLIC EXECUTE 를 기본으로 부여하고,
--     anon · authenticated 는 PUBLIC 을 통해 그 권한을 상속받는다.
--     둘에게서만 revoke 하면 구멍이 그대로 남는다.
-- ────────────────────────────────────────────────────────────

revoke execute on function public.create_booking(uuid, text, text, text, int, text, text, uuid)
  from public;
revoke execute on function public.create_booking(uuid, text, text, text, int, text, text, uuid)
  from anon, authenticated;

-- 역할 조회 헬퍼는 자기 역할만 반환하므로 열어둔다 (정책 내부에서 쓰인다).
grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_staff()          to anon, authenticated;
grant execute on function public.is_admin()          to anon, authenticated;


-- ============================================================
--  검증 — 실행 후 아래를 돌려 결과를 확인한다.
-- ============================================================

-- (1) 8개 테이블 모두 rowsecurity = true 여야 한다.
--
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;

-- (2) 정책 목록 — 위에서 만든 것들이 다 보여야 한다.
--
-- select tablename, policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;

-- (3) create_booking 실행 권한이 실제로 회수됐는지 — 결과가 비어야 정상.
--     한 줄이라도 나오면 브라우저에서 예약을 직접 만들 수 있다는 뜻이다.
--
-- select grantee, privilege_type
-- from information_schema.role_routine_grants
-- where routine_name = 'create_booking'
--   and grantee in ('anon', 'authenticated', 'PUBLIC');

-- (4) 관리자 승격 — 시연 계정을 만든 뒤 실행한다.
--     (회원가입을 먼저 해야 auth.users 에 행이 생긴다)
--
-- update public.profiles
-- set role = 'admin'
-- where email = '여기에_관리자_계정_이메일';
