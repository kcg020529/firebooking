"use client";

import { useMemo, useState } from "react";

const HOLES = [
  { number: 1, par: 4, distance: 382, handicap: 7, x: 72, y: 332, angle: -13, tip: "왼쪽 벙커를 피해 페어웨이 오른쪽을 공략하세요." },
  { number: 2, par: 3, distance: 164, handicap: 15, x: 118, y: 236, angle: 18, tip: "그린 앞 연못 때문에 한 클럽 넉넉한 선택이 안전합니다.", water: true },
  { number: 3, par: 5, distance: 512, handicap: 3, x: 184, y: 148, angle: -28, tip: "세컨드 지점이 좁아지는 도그레그 홀입니다." },
  { number: 4, par: 4, distance: 354, handicap: 11, x: 260, y: 80, angle: 38, tip: "왼쪽 OB보다 중앙의 넓은 랜딩존을 노리세요." },
  { number: 5, par: 4, distance: 401, handicap: 1, x: 340, y: 126, angle: 72, tip: "오르막을 감안해 세컨드 거리를 길게 계산하세요." },
  { number: 6, par: 3, distance: 142, handicap: 17, x: 376, y: 224, angle: -12, tip: "짧아도 그린 뒤 공간이 좁아 정확도가 중요합니다." },
  { number: 7, par: 5, distance: 498, handicap: 5, x: 336, y: 322, angle: -52, tip: "우측 해저드 전까지 끊어가는 3온 전략이 좋습니다.", water: true },
  { number: 8, par: 4, distance: 368, handicap: 9, x: 246, y: 354, angle: 8, tip: "티샷은 왼쪽보다 페어웨이 중앙 우측이 유리합니다." },
  { number: 9, par: 4, distance: 336, handicap: 13, x: 154, y: 342, angle: 48, tip: "클럽하우스를 향하는 완만한 오르막 홀입니다." },
  { number: 10, par: 4, distance: 376, handicap: 8, x: 520, y: 338, angle: 17, tip: "넓은 페어웨이지만 우측 벙커 뒤가 보이지 않습니다." },
  { number: 11, par: 5, distance: 526, handicap: 2, x: 590, y: 278, angle: -34, tip: "장타보다 세컨드 샷의 방향성이 중요한 롱홀입니다." },
  { number: 12, par: 3, distance: 172, handicap: 16, x: 650, y: 190, angle: 24, tip: "바람이 계곡을 타고 불어 핀보다 그린 중앙이 안전합니다.", water: true },
  { number: 13, par: 4, distance: 408, handicap: 4, x: 730, y: 112, angle: 66, tip: "티샷 낙하지점 양쪽 벙커를 피해 정확히 보내세요." },
  { number: 14, par: 4, distance: 348, handicap: 12, x: 820, y: 130, angle: 104, tip: "짧은 도그레그로 드라이버보다 위치 선정이 중요합니다." },
  { number: 15, par: 3, distance: 151, handicap: 18, x: 842, y: 226, angle: -28, tip: "그린 경사가 커서 핀 아래쪽을 노리는 것이 좋습니다." },
  { number: 16, par: 5, distance: 505, handicap: 6, x: 796, y: 326, angle: -72, tip: "연못 앞 안전지대에 끊어 가면 편한 어프로치가 남습니다.", water: true },
  { number: 17, par: 4, distance: 391, handicap: 10, x: 700, y: 350, angle: -12, tip: "슬라이스가 나면 OB 위험이 있어 왼쪽 중앙을 보세요." },
  { number: 18, par: 4, distance: 362, handicap: 14, x: 610, y: 366, angle: -48, tip: "클럽하우스 앞 그린은 앞뒤 단차를 확인하세요." },
];

function HoleShape({ hole, isSelected, onSelect }) {
  const labelY = hole.distance > 450 ? -54 : -45;
  return (
    <g transform={`translate(${hole.x} ${hole.y}) rotate(${hole.angle})`} onClick={() => onSelect(hole.number)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(hole.number); }} role="button" tabIndex="0" aria-label={`${hole.number}번 홀, 파 ${hole.par}, ${hole.distance}미터`} className="cursor-pointer outline-none">
      {hole.water && <ellipse cy="-14" rx="25" ry="15" fill="#55b8d0" opacity="0.85" />}
      <path d={hole.distance > 450 ? "M 0 22 C -18 4 -15 -34 0 -72 C 17 -38 19 0 0 22 Z" : "M 0 18 C -14 2 -12 -26 0 -56 C 15 -27 16 2 0 18 Z"} fill={isSelected ? "#f4d35e" : "#86b85b"} stroke={isSelected ? "#9a6b12" : "#47763b"} strokeWidth={isSelected ? 4 : 2} />
      <ellipse cy={labelY - 7} rx="12" ry="8" fill="#b7dc78" stroke="#47763b" strokeWidth="2" />
      <circle cy="18" r="5" fill="#faf7e8" stroke="#47763b" strokeWidth="2" />
      <g transform={`rotate(${-hole.angle})`}><circle cy={labelY} r="13" fill={isSelected ? "#183f2b" : "#ffffff"} stroke="#183f2b" strokeWidth="2" /><text y={labelY + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={isSelected ? "#ffffff" : "#183f2b"}>{hole.number}</text></g>
    </g>
  );
}

export default function CourseMap({ courseName }) {
  const [courseSide, setCourseSide] = useState("all");
  const [selectedHoleNumber, setSelectedHoleNumber] = useState(1);
  const selectedHole = HOLES.find((hole) => hole.number === selectedHoleNumber);
  const visibleHoles = useMemo(() => courseSide === "out" ? HOLES.slice(0, 9) : courseSide === "in" ? HOLES.slice(9) : HOLES, [courseSide]);

  function handleCourseSide(side) {
    setCourseSide(side);
    if (side === "out" && selectedHoleNumber > 9) setSelectedHoleNumber(1);
    if (side === "in" && selectedHoleNumber < 10) setSelectedHoleNumber(10);
  }

  return (
    <section className="mx-auto max-w-5xl px-6 py-8" aria-labelledby="course-map-title">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Course guide · Demo</p><h2 id="course-map-title" className="mt-1 text-xl font-bold">2D 코스맵</h2><p className="mt-1 text-sm text-muted-foreground">홀을 선택해 거리와 공략 정보를 확인하세요.</p></div>
          <div className="flex rounded-xl bg-muted p-1" aria-label="코스 구간 선택">
            {[["all", "전체"], ["out", "OUT 1–9"], ["in", "IN 10–18"]].map(([value, label]) => <button key={value} type="button" onClick={() => handleCourseSide(value)} aria-pressed={courseSide === value} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${courseSide === value ? "bg-card text-brand shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
          </div>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative min-h-[360px] overflow-hidden bg-[#dce8cc] p-3 sm:p-5">
            <div className="absolute left-5 top-4 z-10 rounded-lg bg-white/85 px-3 py-2 text-xs font-medium text-[#24452f] shadow-sm backdrop-blur">{courseName} · 18H / PAR 72</div>
            <svg viewBox="0 0 920 430" className="h-full min-h-[330px] w-full" role="img" aria-label={`${courseName} 18홀 데모 코스맵`}>
              <defs><linearGradient id="courseGround" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e7efd9" /><stop offset="1" stopColor="#c7d9b5" /></linearGradient><pattern id="contours" width="70" height="45" patternUnits="userSpaceOnUse"><path d="M-10 30 Q25 5 80 25" fill="none" stroke="#9db589" strokeWidth="1" opacity="0.45" /></pattern></defs>
              <rect width="920" height="430" rx="22" fill="url(#courseGround)" /><rect width="920" height="430" rx="22" fill="url(#contours)" />
              <path d="M445 35 C420 115 474 178 445 252 C424 305 455 359 444 410" fill="none" stroke="#f7f2dc" strokeWidth="14" strokeLinecap="round" /><path d="M445 35 C420 115 474 178 445 252 C424 305 455 359 444 410" fill="none" stroke="#b4aa8a" strokeWidth="2" strokeDasharray="5 8" />
              <rect x="421" y="188" width="49" height="35" rx="6" fill="#7a4f32" /><path d="M421 188 L445 171 L470 188" fill="#a96d45" /><text x="445" y="237" textAnchor="middle" fontSize="10" fontWeight="700" fill="#4d493e">CLUB HOUSE</text>
              {visibleHoles.map((hole) => <HoleShape key={hole.number} hole={hole} isSelected={hole.number === selectedHoleNumber} onSelect={setSelectedHoleNumber} />)}
            </svg>
            <div className="absolute bottom-5 left-5 flex flex-wrap gap-3 rounded-lg bg-white/85 px-3 py-2 text-[11px] text-[#24452f] shadow-sm backdrop-blur"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#86b85b]" />페어웨이</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#b7dc78]" />그린</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-[#55b8d0]" />해저드</span></div>
          </div>
          <aside className="border-t border-border p-5 lg:border-l lg:border-t-0" aria-live="polite">
            <div className="flex items-start justify-between"><div><p className="text-sm font-medium text-muted-foreground">HOLE</p><p className="mt-1 text-5xl font-black tracking-tight text-brand">{selectedHole.number}</p></div><span className="rounded-full bg-brand px-3 py-1.5 text-sm font-bold text-brand-foreground">PAR {selectedHole.par}</span></div>
            <dl className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">거리</dt><dd className="mt-1 text-lg font-bold">{selectedHole.distance}m</dd></div><div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">핸디캡</dt><dd className="mt-1 text-lg font-bold">HCP {selectedHole.handicap}</dd></div></dl>
            <div className="mt-5 border-t border-border pt-5"><h3 className="text-sm font-bold">공략 포인트</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedHole.tip}</p></div>
            <div className="mt-5 grid grid-cols-6 gap-1.5" aria-label="홀 바로 선택">{visibleHoles.map((hole) => <button key={hole.number} type="button" onClick={() => setSelectedHoleNumber(hole.number)} aria-label={`${hole.number}번 홀 선택`} className={`aspect-square rounded-md text-xs font-semibold transition ${selectedHole.number === hole.number ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{hole.number}</button>)}</div>
          </aside>
        </div>
      </div>
    </section>
  );
}
