/**
 * 순수 CSS 수평 막대 리스트 — Top N 항목을 값 비례 막대로 보여준다.
 * 보안 대시보드의 '규칙별 히트' 막대와 같은 방식이라 화면 간 인상이 통일된다.
 *
 * @param {object} props
 * @param {{ label: string, value: number, sub?: string }[]} props.items  큰 값부터 정렬돼 들어온다고 가정
 * @param {string} [props.color]        막대 색(CSS 값). 기본 브랜드.
 * @param {(n:number)=>string} [props.formatValue]
 * @param {string} [props.emptyText]
 */
export default function BarList({
  items = [],
  color = "var(--brand)",
  formatValue = (n) => String(n),
  emptyText = "데이터가 없습니다.",
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const max = Math.max(1, ...items.map((it) => it.value));

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it) => {
        const width = (it.value / max) * 100;
        return (
          <li key={it.label} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate font-mono text-xs" title={it.label}>
              {it.label}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full"
                style={{ width: `${width}%`, backgroundColor: color, opacity: 0.75 }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-sm tabular-nums">
              {formatValue(it.value)}
              {it.sub && <span className="ml-1 text-xs text-muted-foreground">{it.sub}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
