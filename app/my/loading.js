/**
 * /my 는 서버에서 예약을 조회한 뒤에야 렌더된다.
 * 그동안 화면이 비어 있으면 "안 눌린 건가" 싶어진다 —
 * 골격을 먼저 띄워 이동이 시작됐다는 걸 즉시 보여준다.
 */
export default function MyLoading() {
  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl animate-pulse">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="mt-2 h-4 w-48 rounded bg-muted" />

        <ul className="mt-8 flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <div className="h-5 w-40 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
              </div>
              <div className="mt-3 h-4 w-56 rounded bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
