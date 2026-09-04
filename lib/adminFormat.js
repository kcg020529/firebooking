/**
 * 관리자 대시보드 표기 헬퍼.
 *
 * /admin/security 와 /admin/audit 이 같은 규칙으로 시각·해시·쿼리를 만들도록
 * 한 곳에 모은다. 두 화면에 같은 포맷 코드를 복사해두면 한쪽만 고쳐져서
 * "같은 로그인데 화면마다 시각이 다르게 보이는" 사고가 난다.
 */

/** 목록용 짧은 시각 — '09/03 14:22:31'. 연도는 hover(title)에서 본다. */
export function formatTimestamp(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";

  const pad = (n) => String(n).padStart(2, "0");

  return (
    `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** hover 로 보여줄 전체 시각. */
export function formatFullTimestamp(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
}

/**
 * IP 해시는 앞 8자만 보여준다.
 * 전체를 그대로 늘어놓으면 표가 읽히지 않고, 같은 IP 인지 비교하는 데는 앞자리로 충분하다.
 */
export function shortHash(hash) {
  if (!hash) return "-";
  return hash.slice(0, 8);
}

/**
 * <input type="date"> 값('YYYY-MM-DD')을 그 날의 시작/끝 ISO 문자열로 바꾼다.
 *
 * 날짜 문자열을 API 에 그대로 넘기면 DB(UTC) 기준으로 해석돼서 KST 하루가
 * 9시간 밀린다. 로컬 자정 기준으로 변환해서 보낸다.
 */
export function startOfDayIso(dateValue) {
  if (!dateValue) return undefined;
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function endOfDayIso(dateValue) {
  if (!dateValue) return undefined;
  const date = new Date(`${dateValue}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** 빈 값은 빼고 쿼리스트링을 만든다. 빈 필터가 API 검증에 걸리지 않게. */
export function buildQuery(params) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, value);
  }

  return query.toString();
}
