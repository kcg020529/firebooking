import Link from "next/link";

/**
 * 관리자 영역 인덱스.
 *
 * 하위 대시보드(/admin/security · /admin/audit · /admin/report)는 B 담당이다.
 * 여기는 진입점과 권한 가드 동작 확인용이며, 권한 검사는 app/admin/layout.js 가
 * 이미 처리했다 — 이 페이지가 렌더된다는 것 자체가 staff/admin 이라는 뜻이다.
 */
const SECTIONS = [
  {
    href: "/admin/security",
    title: "보안 대시보드",
    description: "탐지 이벤트 타임라인, 심각도별 건수, 규칙별 히트",
  },
  {
    href: "/admin/audit",
    title: "감사 로그",
    description: "누가 언제 무엇을 했고 허용·거부됐는지",
  },
  {
    href: "/admin/report",
    title: "리포트",
    description: "기간별 탐지 요약 · Top IP",
  },
];

export default function AdminIndexPage() {
  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold">관리자</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          보안 모니터링과 감사 기록을 확인합니다.
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="block rounded-xl border border-border bg-card p-4 transition hover:opacity-80"
              >
                <h2 className="font-semibold">{section.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-xs text-muted-foreground">
          아직 준비 중인 화면이 있습니다. 각 대시보드는 순차적으로 연결됩니다.
        </p>
      </div>
    </main>
  );
}
