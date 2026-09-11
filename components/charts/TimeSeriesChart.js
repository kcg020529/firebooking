/**
 * 순수 SVG 시계열 차트 — 외부 차트 라이브러리 없이 라인/영역을 그린다.
 *
 * 여러 계열(series)을 겹쳐 그릴 수 있다(예: 심각도 상·중·하). 색은 CSS 변수
 * (`var(--critical)` 등)로 넘겨 다크모드에서도 자동으로 맞게 한다.
 * viewBox 기반이라 컨테이너 폭에 맞춰 늘어난다.
 *
 * @param {object} props
 * @param {{ name: string, color: string, values: number[], area?: boolean }[]} props.series
 * @param {string[]} props.labels   x축 눈금 라벨(값 배열과 길이 동일)
 * @param {number} [props.height=200]
 * @param {(n:number)=>string} [props.formatValue]
 */
const VB_W = 720;
const PAD = { top: 12, right: 10, bottom: 24, left: 44 };

function niceMax(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export default function TimeSeriesChart({
  series = [],
  labels = [],
  height = 200,
  formatValue = (n) => String(n),
}) {
  const n = labels.length;
  const allValues = series.flatMap((s) => s.values);
  const hasData = n > 0 && allValues.some((v) => v > 0);
  const maxV = niceMax(Math.max(1, ...allValues));

  const plotW = VB_W - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  // 점이 1개뿐이면 가운데에, 여러 개면 균등 배치.
  const xAt = (i) => (n <= 1 ? PAD.left + plotW / 2 : PAD.left + (i / (n - 1)) * plotW);
  const yAt = (v) => PAD.top + plotH - (v / maxV) * plotH;

  const gridVals = [0, maxV / 2, maxV];

  // x 라벨은 과하지 않게 최대 5개만.
  const tickEvery = n <= 5 ? 1 : Math.ceil(n / 5);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${VB_W} ${height}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        className="block"
      >
        {/* 가로 그리드 + y 라벨 */}
        {gridVals.map((gv, i) => {
          const y = yAt(gv);
          return (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={y}
                x2={VB_W - PAD.right}
                y2={y}
                style={{ stroke: "var(--border)" }}
                strokeWidth="1"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                style={{ fill: "var(--muted-foreground)" }}
                fontSize="10"
              >
                {formatValue(Math.round(gv))}
              </text>
            </g>
          );
        })}

        {/* x 라벨 */}
        {labels.map((lb, i) =>
          i % tickEvery === 0 || i === n - 1 ? (
            <text
              key={i}
              x={xAt(i)}
              y={height - 8}
              textAnchor="middle"
              style={{ fill: "var(--muted-foreground)" }}
              fontSize="10"
            >
              {lb}
            </text>
          ) : null
        )}

        {/* 계열 */}
        {hasData &&
          series.map((s) => {
            const pts = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
            const areaD =
              `M ${xAt(0)},${yAt(0)} ` +
              s.values.map((v, i) => `L ${xAt(i)},${yAt(v)}`).join(" ") +
              ` L ${xAt(n - 1)},${yAt(0)} Z`;
            return (
              <g key={s.name}>
                {s.area && (
                  <path d={areaD} style={{ fill: s.color, opacity: 0.14 }} />
                )}
                <polyline
                  points={pts}
                  fill="none"
                  style={{ stroke: s.color }}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

        {!hasData && (
          <text
            x={VB_W / 2}
            y={height / 2}
            textAnchor="middle"
            style={{ fill: "var(--muted-foreground)" }}
            fontSize="12"
          >
            데이터가 없습니다
          </text>
        )}
      </svg>

      {/* 범례 — 계열이 2개 이상일 때만 */}
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
