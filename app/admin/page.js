import Link from "next/link";

/**
 * 관리자 영역 인덱스.
 *
 * 권한 검사는 app/admin/layout.js 가 이미 처리했다 — 이 페이지가 렌더된다는 것
 * 자체가 staff/admin 이라는 뜻이다. 상단 탭 네비게이션도 layout 이 제공한다.
 *
 * 리포트(/admin/report)는 화면이 아직 없어 목록에서 제외한다 — 없는 기능의 링크를 두지 않는다.
 */
const SECTIONS = [
  {
    href: "/admin/security",
    title: "보안 대시보드",
    description: "탐지 이벤트 타임라인, 심각도별 건수, 규칙별 히트를 5초마다 자동 갱신",
  },
  {
    href: "/admin/audit",
    title: "감사 로그",
    description: "누가 언제 무엇을 했고 허용·거부됐는지 — 거부는 눈에 띄게, 5초마다 자동 갱신",
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

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link
                href={section.href}
                className="group block h-full rounded-xl border border-border bg-card p-4 transition hover:border-brand/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{section.title}</h2>
                  <span className="text-muted-foreground transition group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
