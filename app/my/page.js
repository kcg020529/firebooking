import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listMyBookings } from "@/lib/bookings";
import LogoutButton from "@/components/LogoutButton";

/** 로그인 상태에 따라 내용이 달라지므로 캐시하지 않는다. */
export const dynamic = "force-dynamic";

const TYPE_LABEL = { field: "필드", screen: "스크린" };

function formatDateTime(date, time) {
  // DB 는 date/time 을 문자열로 준다. 그대로 조립해 보여준다.
  return `${date} ${String(time).slice(0, 5)}`;
}

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const bookings = await listMyBookings(user.id);

  return (
    <main className="flex-1 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">내 예약</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.displayName ?? user.email}
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{user.role}</span>
            </p>
          </div>
          <LogoutButton />
        </div>

        {bookings.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">아직 예약이 없습니다.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
            >
              골프장 둘러보기
            </Link>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {bookings.map((b) => (
              <li
                key={b.bookingCode}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-semibold">{b.courseName}</h2>
                  <span className="font-mono text-sm text-muted-foreground">
                    {b.bookingCode}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {TYPE_LABEL[b.courseType] ?? b.courseType} ·{" "}
                  {formatDateTime(b.date, b.time)} · {b.partySize}명
                </p>
                {b.memo && (
                  <p className="mt-2 text-xs text-muted-foreground">메모: {b.memo}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
