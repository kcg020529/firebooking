"use client";

import { useMemo, useState } from "react";

// 18홀 코스 마스터플랜 및 텔레메트리 데이터
const HOLES = [
  {
    number: 1,
    side: "out",
    par: 4,
    distance: 382,
    yards: 418,
    handicap: 7,
    name: "스타팅 페어웨이",
    elevation: "완만한 내리막 -3m",
    hazards: ["우측 페어웨이 벙커", "좌측 가드 벙커"],
    tip: "클럽하우스에서 출발하는 첫 홀입니다. 오른쪽 벙커 좌측으로 티샷을 보내면 세컨드 공략 각도가 가장 이상적입니다.",
    recommendClub: "1W (230m) → 8I (145m)",
    landingWidth: "46m (넓음)",
    fairwayAccuracy: "88%",
    teeBox: { x: 415, y: 275 },
    landing: { x: 350, y: 330 },
    green: { x: 282, y: 382 },
    pin: { x: 280, y: 379 },
    badge: { x: 352, y: 308 },
    fairwayPath: "M 418 272 C 388 292 364 308 342 328 C 314 354 294 368 272 386 C 286 398 316 384 344 358 C 374 342 408 314 430 282 Z",
    greenPath: "M 282 382 m -17 0 a 17 14 0 1 0 34 0 a 17 14 0 1 0 -34 0",
    bunkers: [
      "M 378 304 C 388 298 398 308 392 318 C 382 324 374 314 378 304 Z",
      "M 268 376 C 276 368 284 376 278 386 C 270 388 264 382 268 376 Z",
    ],
    shotTrajectory: "M 415 275 Q 355 328 280 379",
  },
  {
    number: 2,
    side: "out",
    par: 3,
    distance: 164,
    yards: 179,
    handicap: 15,
    name: "웨스트 레이크 폰드",
    elevation: "평지 +1m",
    hazards: ["전면 웨스트 레이크", "그린 우측 벙커"],
    tip: "호수를 넘겨야 하는 파 3 홀입니다. 맞바람이 잦으므로 한 클럽 여유 있게 잡고 그린 중앙을 직접 공략하세요.",
    recommendClub: "6I (155m 핀 직접 공략)",
    landingWidth: "그린 폭 28m",
    fairwayAccuracy: "74%",
    teeBox: { x: 242, y: 418 },
    landing: { x: 198, y: 432 },
    green: { x: 154, y: 446 },
    pin: { x: 152, y: 443 },
    badge: { x: 202, y: 402 },
    fairwayPath: "M 240 412 C 205 422 182 428 158 434 C 146 454 168 462 196 452 C 222 442 248 434 246 418 Z",
    greenPath: "M 154 446 m -16 0 a 16 14 0 1 0 32 0 a 16 14 0 1 0 -32 0",
    bunkers: [
      "M 174 434 C 184 428 190 438 184 446 C 176 448 170 440 174 434 Z",
    ],
    shotTrajectory: "M 242 418 Q 198 432 152 443",
  },
  {
    number: 3,
    side: "out",
    par: 5,
    distance: 512,
    yards: 560,
    handicap: 3,
    name: "웨스턴 리지 롱홀",
    elevation: "완만한 오르막 +6m",
    hazards: ["1차 랜딩존 우측 벙커", "2차 랜딩존 좌측 숲", "그린사이드 팟 벙커"],
    tip: "서쪽 외곽을 따라 북쪽으로 뻗은 롱홀입니다. 무리한 2온보다는 안전한 3온 레이업 전략이 스코어를 지킵니다.",
    recommendClub: "1W (225m) → 3W (210m) → PW (75m)",
    landingWidth: "38m (도그레그 주의)",
    fairwayAccuracy: "68%",
    teeBox: { x: 104, y: 436 },
    landing: { x: 80, y: 330 },
    landing2: { x: 92, y: 225 },
    green: { x: 118, y: 128 },
    pin: { x: 116, y: 126 },
    badge: { x: 62, y: 285 },
    fairwayPath: "M 102 436 C 74 374 64 314 74 248 C 84 192 98 158 114 126 C 130 132 120 168 110 228 C 100 288 112 358 122 430 Z",
    greenPath: "M 118 128 m -16 0 a 16 18 0 1 0 32 0 a 16 18 0 1 0 -32 0",
    bunkers: [
      "M 98 322 C 110 314 116 326 108 336 C 96 338 92 326 98 322 Z",
      "M 106 144 C 116 138 120 148 114 154 C 104 156 100 146 106 144 Z",
    ],
    shotTrajectory: "M 104 436 Q 74 330 92 225 T 116 126",
  },
  {
    number: 4,
    side: "out",
    par: 4,
    distance: 354,
    yards: 387,
    handicap: 11,
    name: "노스 포레스트 턴",
    elevation: "평지 -1m",
    hazards: ["좌측 숲속 OB", "랜딩존 좌측 크로스 벙커"],
    tip: "북쪽 숲을 감싸 안고 오른쪽으로 부드럽게 꺾이는 도그레그 홀입니다. 드라이버는 페어웨이 중앙 우측을 노리세요.",
    recommendClub: "3W (210m) → 9I (135m)",
    landingWidth: "44m (적정)",
    fairwayAccuracy: "82%",
    teeBox: { x: 136, y: 106 },
    landing: { x: 216, y: 82 },
    green: { x: 292, y: 76 },
    pin: { x: 290, y: 74 },
    badge: { x: 216, y: 56 },
    fairwayPath: "M 134 102 C 172 84 212 68 252 68 C 276 68 292 70 304 78 C 298 92 268 94 232 96 C 192 98 156 116 136 116 Z",
    greenPath: "M 292 76 m -17 0 a 17 13 0 1 0 34 0 a 17 13 0 1 0 -34 0",
    bunkers: [
      "M 206 60 C 218 54 226 64 218 72 C 206 72 200 64 206 60 Z",
    ],
    shotTrajectory: "M 136 106 Q 216 82 290 74",
  },
  {
    number: 5,
    side: "out",
    par: 4,
    distance: 401,
    yards: 439,
    handicap: 1,
    name: "밸리 슬로프 (시그니처)",
    elevation: "급경사 오르막 +9m",
    hazards: ["우측 깊은 벙커밭", "2단 경사 언듈레이션 그린"],
    tip: "핸디캡 1번의 난이도 높은 홀입니다. 오르막 경사가 심하므로 세컨드 샷 시 1~2클럽 길게 보고 핀 아래를 타겟으로 잡으세요.",
    recommendClub: "1W (230m) → 6I (160m 오르막)",
    landingWidth: "32m (슬로프 주의)",
    fairwayAccuracy: "64%",
    teeBox: { x: 316, y: 92 },
    landing: { x: 366, y: 142 },
    green: { x: 406, y: 196 },
    pin: { x: 404, y: 194 },
    badge: { x: 390, y: 128 },
    fairwayPath: "M 314 86 C 344 112 372 132 396 166 C 412 186 416 196 420 206 C 406 214 396 202 382 176 C 356 146 332 122 310 98 Z",
    greenPath: "M 406 196 m -16 0 a 16 15 0 1 0 32 0 a 16 15 0 1 0 -32 0",
    bunkers: [
      "M 384 128 C 396 122 404 132 396 142 C 386 144 380 134 384 128 Z",
      "M 416 192 C 424 186 430 196 424 204 C 416 206 412 198 416 192 Z",
    ],
    shotTrajectory: "M 316 92 Q 366 142 404 194",
  },
  {
    number: 6,
    side: "out",
    par: 3,
    distance: 142,
    yards: 155,
    handicap: 17,
    name: "포레스트 가든",
    elevation: "내리막 -4m",
    hazards: ["그린 앞 듀얼 팟 벙커"],
    tip: "거리는 짧지만 숲에 둘러싸여 그린 주변 여유 공간이 적습니다. 핀을 직접 노리는 정교한 아이언 샷이 요구됩니다.",
    recommendClub: "8I (135m 내리막)",
    landingWidth: "그린 폭 24m",
    fairwayAccuracy: "78%",
    teeBox: { x: 416, y: 106 },
    landing: { x: 388, y: 80 },
    green: { x: 364, y: 56 },
    pin: { x: 362, y: 54 },
    badge: { x: 412, y: 76 },
    fairwayPath: "M 418 108 C 400 94 384 80 374 64 C 360 52 354 58 364 72 C 380 90 396 110 422 114 Z",
    greenPath: "M 364 56 m -14 0 a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0",
    bunkers: [
      "M 348 48 C 356 42 364 50 358 56 C 350 56 346 50 348 48 Z",
    ],
    shotTrajectory: "M 416 106 Q 388 80 362 54",
  },
  {
    number: 7,
    side: "out",
    par: 5,
    distance: 498,
    yards: 545,
    handicap: 5,
    name: "레이크사이드 턴",
    elevation: "완만한 내리막 -5m",
    hazards: ["중앙 좌측 연못", "페어웨이 가로지르는 크릭"],
    tip: "웨스트 레이크 방향으로 완만하게 내려가는 S자 도그레그 홀입니다. 세컨드 샷에서 연못 앞 안전지대에 끊어가는 것이 현명합니다.",
    recommendClub: "1W (220m) → 5W (190m) → 52° (85m)",
    landingWidth: "36m (연못 경계)",
    fairwayAccuracy: "70%",
    teeBox: { x: 336, y: 176 },
    landing: { x: 274, y: 216 },
    landing2: { x: 208, y: 262 },
    green: { x: 164, y: 322 },
    pin: { x: 162, y: 320 },
    badge: { x: 236, y: 214 },
    fairwayPath: "M 336 172 C 296 202 246 236 196 286 C 176 306 160 322 154 332 C 168 336 186 322 216 286 C 266 246 316 212 346 182 Z",
    greenPath: "M 164 322 m -16 0 a 16 15 0 1 0 32 0 a 16 15 0 1 0 -32 0",
    bunkers: [
      "M 262 200 C 274 194 280 204 272 214 C 260 214 256 204 262 200 Z",
    ],
    shotTrajectory: "M 336 176 Q 274 216 208 262 T 162 320",
  },
  {
    number: 8,
    side: "out",
    par: 4,
    distance: 368,
    yards: 402,
    handicap: 9,
    name: "센트럴 크로스",
    elevation: "평지 +0m",
    hazards: ["우측 센트럴 레이크", "좌측 벙커"],
    tip: "호수를 오른쪽에 끼고 도는 홀입니다. 슬라이스 시 워터 해저드에 빠지기 쉬우므로 페어웨이 중앙 약간 왼쪽을 타겟팅하세요.",
    recommendClub: "1W (220m) → 7I (145m)",
    landingWidth: "40m (중앙 우측)",
    fairwayAccuracy: "80%",
    teeBox: { x: 186, y: 346 },
    landing: { x: 252, y: 342 },
    green: { x: 316, y: 316 },
    pin: { x: 314, y: 314 },
    badge: { x: 252, y: 368 },
    fairwayPath: "M 186 340 C 222 334 266 328 306 310 C 324 316 320 328 296 338 C 260 356 216 358 186 352 Z",
    greenPath: "M 316 316 m -16 0 a 16 14 0 1 0 32 0 a 16 14 0 1 0 -32 0",
    bunkers: [
      "M 236 354 C 246 350 252 358 246 366 C 236 366 230 360 236 354 Z",
    ],
    shotTrajectory: "M 186 346 Q 252 342 314 314",
  },
  {
    number: 9,
    side: "out",
    par: 4,
    distance: 336,
    yards: 367,
    handicap: 13,
    name: "클럽하우스 어프로치",
    elevation: "완만한 오르막 +4m",
    hazards: ["그린 앞 가드 벙커 2개"],
    tip: "전반을 마무리하며 클럽하우스를 마주보고 치는 홀입니다. 티샷 랜딩존이 넓어 과감한 드라이버 공략이 가능합니다.",
    recommendClub: "1W (225m) → PW (110m 오르막)",
    landingWidth: "48m (넓음)",
    fairwayAccuracy: "90%",
    teeBox: { x: 332, y: 292 },
    landing: { x: 386, y: 262 },
    green: { x: 432, y: 242 },
    pin: { x: 430, y: 240 },
    badge: { x: 376, y: 284 },
    fairwayPath: "M 330 286 C 362 266 396 248 426 236 C 436 246 426 256 396 274 C 366 292 346 302 332 298 Z",
    greenPath: "M 432 242 m -15 0 a 15 13 0 1 0 30 0 a 15 13 0 1 0 -30 0",
    bunkers: [
      "M 412 248 C 420 242 426 250 420 258 C 412 258 408 252 412 248 Z",
    ],
    shotTrajectory: "M 332 292 Q 386 262 430 240",
  },
  {
    number: 10,
    side: "in",
    par: 4,
    distance: 376,
    yards: 411,
    handicap: 8,
    name: "이스트 스타트",
    elevation: "평지 +1m",
    hazards: ["우측 페어웨이 벙커", "그린 뒤 내리막 숲"],
    tip: "후반 인코스 시작 홀입니다. 넓고 평탄한 페어웨이지만 우측 벙커를 피해야 세컨드에서 그린 전체를 편안하게 볼 수 있습니다.",
    recommendClub: "1W (230m) → 8I (140m)",
    landingWidth: "45m (평탄)",
    fairwayAccuracy: "86%",
    teeBox: { x: 546, y: 256 },
    landing: { x: 616, y: 282 },
    green: { x: 682, y: 306 },
    pin: { x: 680, y: 304 },
    badge: { x: 616, y: 256 },
    fairwayPath: "M 546 250 C 586 266 626 286 676 300 C 686 312 672 322 632 306 C 592 292 562 276 542 262 Z",
    greenPath: "M 682 306 m -16 0 a 16 14 0 1 0 32 0 a 16 14 0 1 0 -32 0",
    bunkers: [
      "M 632 296 C 642 290 648 298 642 306 C 632 308 626 302 632 296 Z",
    ],
    shotTrajectory: "M 546 256 Q 616 282 680 304",
  },
  {
    number: 11,
    side: "in",
    par: 5,
    distance: 526,
    yards: 575,
    handicap: 2,
    name: "이스트 리지 롱홀",
    elevation: "오르막 +7m",
    hazards: ["1차 랜딩존 좌측 벙커", "우측 OB 구역"],
    tip: "동쪽 외곽을 따라 길게 뻗은 가장 긴 롱홀입니다. 장타보다 티샷과 세컨드 샷의 안정적인 방향성이 파 세이브의 열쇠입니다.",
    recommendClub: "1W (235m) → 3W (215m) → 56° (75m)",
    landingWidth: "34m (외곽 벙커)",
    fairwayAccuracy: "65%",
    teeBox: { x: 702, y: 322 },
    landing: { x: 776, y: 346 },
    landing2: { x: 846, y: 306 },
    green: { x: 892, y: 232 },
    pin: { x: 890, y: 230 },
    badge: { x: 812, y: 372 },
    fairwayPath: "M 700 316 C 752 336 806 356 846 326 C 876 300 886 266 896 232 C 906 236 896 276 862 322 C 822 366 762 366 702 332 Z",
    greenPath: "M 892 232 m -16 0 a 16 16 0 1 0 32 0 a 16 16 0 1 0 -32 0",
    bunkers: [
      "M 786 360 C 796 354 804 364 796 372 C 786 374 780 366 786 360 Z",
    ],
    shotTrajectory: "M 702 322 Q 776 346 846 306 T 890 230",
  },
  {
    number: 12,
    side: "in",
    par: 3,
    distance: 172,
    yards: 188,
    handicap: 16,
    name: "이스트 밸리 레이크",
    elevation: "계곡 내리막 -6m",
    hazards: ["이스트 레이크 연못 넘기기", "그린 앞 샌드 트랩"],
    tip: "계곡과 호수를 넘겨야 하는 아름다운 시그니처 파 3입니다. 계곡풍이 핀을 향해 불어오므로 넉넉한 번호 선택이 안전합니다.",
    recommendClub: "5I (165m 맞바람 대비)",
    landingWidth: "그린 폭 26m",
    fairwayAccuracy: "72%",
    teeBox: { x: 896, y: 206 },
    landing: { x: 884, y: 160 },
    green: { x: 876, y: 122 },
    pin: { x: 874, y: 120 },
    badge: { x: 928, y: 162 },
    fairwayPath: "M 898 208 C 890 176 886 156 880 126 C 870 116 866 126 870 152 C 876 182 886 198 894 214 Z",
    greenPath: "M 876 122 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0",
    bunkers: [
      "M 866 132 C 876 126 882 136 876 144 C 866 144 862 136 866 132 Z",
    ],
    shotTrajectory: "M 896 206 Q 884 160 874 120",
  },
  {
    number: 13,
    side: "in",
    par: 4,
    distance: 408,
    yards: 446,
    handicap: 4,
    name: "하이랜드 리지",
    elevation: "평지 +2m",
    hazards: ["낙하지점 양쪽 벙커", "깊은 러프"],
    tip: "북동쪽 능선을 따라 서쪽으로 치고 나가는 전장이 긴 파 4 홀입니다. 티샷 낙하지점 양쪽 벙커 사이를 정확하게 노려야 합니다.",
    recommendClub: "1W (235m) → 6I (165m)",
    landingWidth: "35m (크로스 벙커)",
    fairwayAccuracy: "69%",
    teeBox: { x: 852, y: 96 },
    landing: { x: 772, y: 76 },
    green: { x: 692, y: 72 },
    pin: { x: 690, y: 70 },
    badge: { x: 772, y: 52 },
    fairwayPath: "M 852 90 C 806 76 766 66 716 66 C 686 66 682 76 692 86 C 732 90 776 96 836 106 Z",
    greenPath: "M 692 72 m -16 0 a 16 14 0 1 0 32 0 a 16 14 0 1 0 -32 0",
    bunkers: [
      "M 782 60 C 792 54 798 64 792 72 C 782 72 776 66 782 60 Z",
    ],
    shotTrajectory: "M 852 96 Q 772 76 690 70",
  },
  {
    number: 14,
    side: "in",
    par: 4,
    distance: 348,
    yards: 381,
    handicap: 12,
    name: "도그레그 코너",
    elevation: "내리막 -3m",
    hazards: ["코너 우측 도그레그 벙커", "그린 우측 급경사"],
    tip: "남서쪽으로 꺾이는 짧은 도그레그 홀입니다. 무리하게 가로지르기보다는 200m 전후 우드나 유틸리티 티샷이 안정적인 버디 기회를 줍니다.",
    recommendClub: "5W (200m 코너 공략) → 9I (130m)",
    landingWidth: "42m (코너 턴)",
    fairwayAccuracy: "79%",
    teeBox: { x: 672, y: 66 },
    landing: { x: 612, y: 96 },
    green: { x: 566, y: 146 },
    pin: { x: 564, y: 144 },
    badge: { x: 632, y: 82 },
    fairwayPath: "M 672 62 C 636 76 606 102 576 136 C 562 154 572 162 586 146 C 616 122 646 96 680 74 Z",
    greenPath: "M 566 146 m -15 0 a 15 14 0 1 0 30 0 a 15 14 0 1 0 -30 0",
    bunkers: [
      "M 622 84 C 632 78 638 88 632 94 C 622 96 616 90 622 84 Z",
    ],
    shotTrajectory: "M 672 66 Q 612 96 564 144",
  },
  {
    number: 15,
    side: "in",
    par: 3,
    distance: 151,
    yards: 165,
    handicap: 18,
    name: "트리플 벙커 핀",
    elevation: "내리막 -2m",
    hazards: ["그린 3면을 감싼 샌드 벙커"],
    tip: "그린이 3개의 벙커로 철저하게 보호받고 있습니다. 그린 앞뒤 단차가 커서 핀보다 살짝 짧게 올리는 것이 안전한 2퍼트 공략입니다.",
    recommendClub: "9I (138m 벙커 캐리)",
    landingWidth: "그린 폭 25m",
    fairwayAccuracy: "75%",
    teeBox: { x: 586, y: 166 },
    landing: { x: 610, y: 188 },
    green: { x: 636, y: 212 },
    pin: { x: 634, y: 210 },
    badge: { x: 582, y: 202 },
    fairwayPath: "M 586 162 C 606 176 622 192 636 206 C 646 220 636 226 622 216 C 602 202 586 186 582 174 Z",
    greenPath: "M 636 212 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0",
    bunkers: [
      "M 646 198 C 656 192 662 202 656 210 C 646 210 642 202 646 198 Z",
      "M 622 222 C 630 216 636 224 630 230 C 622 230 618 224 622 222 Z",
    ],
    shotTrajectory: "M 586 166 Q 610 188 634 210",
  },
  {
    number: 16,
    side: "in",
    par: 5,
    distance: 505,
    yards: 552,
    handicap: 6,
    name: "레이크 밸리 롱홀",
    elevation: "내리막 -7m",
    hazards: ["우측 센트럴 레이크 수역", "세컨드 낙하지점 벙커"],
    tip: "오른편 호수를 감싸며 남쪽으로 시원하게 내려오는 파 5입니다. 우측 해저드를 경계하며 페어웨이 좌측 능선을 적극 활용하세요.",
    recommendClub: "1W (230m) → 4U (195m) → 52° (80m)",
    landingWidth: "37m (워터 해저드)",
    fairwayAccuracy: "66%",
    teeBox: { x: 706, y: 216 },
    landing: { x: 772, y: 252 },
    landing2: { x: 746, y: 346 },
    green: { x: 702, y: 436 },
    pin: { x: 700, y: 434 },
    badge: { x: 786, y: 292 },
    fairwayPath: "M 706 212 C 752 232 786 266 772 322 C 756 366 732 402 702 436 C 716 444 746 406 772 362 C 796 306 786 246 716 216 Z",
    greenPath: "M 702 436 m -16 0 a 16 15 0 1 0 32 0 a 16 15 0 1 0 -32 0",
    bunkers: [
      "M 752 356 C 762 350 770 360 762 368 C 752 368 746 360 752 356 Z",
    ],
    shotTrajectory: "M 706 216 Q 772 252 746 346 T 700 434",
  },
  {
    number: 17,
    side: "in",
    par: 4,
    distance: 391,
    yards: 428,
    handicap: 10,
    name: "워터 사이드 웨이",
    elevation: "평지 +0m",
    hazards: ["남측 거대 호수 해저드", "그린 앞 세컨드 벙커"],
    tip: "남쪽 호수 수면을 따라 서쪽으로 진행하는 까다로운 미들홀입니다. 슬라이스 바람이 자주 불므로 타겟을 좌측 페어웨이로 설정하세요.",
    recommendClub: "1W (225m) → 7I (150m)",
    landingWidth: "38m (호수 바람)",
    fairwayAccuracy: "73%",
    teeBox: { x: 676, y: 456 },
    landing: { x: 606, y: 472 },
    green: { x: 532, y: 456 },
    pin: { x: 530, y: 454 },
    badge: { x: 606, y: 496 },
    fairwayPath: "M 676 452 C 642 462 596 466 546 456 C 526 452 532 464 556 476 C 602 486 646 482 682 464 Z",
    greenPath: "M 532 456 m -16 0 a 16 14 0 1 0 32 0 a 16 14 0 1 0 -32 0",
    bunkers: [
      "M 592 456 C 602 450 608 458 602 466 C 592 466 586 460 592 456 Z",
    ],
    shotTrajectory: "M 676 456 Q 606 472 530 454",
  },
  {
    number: 18,
    side: "in",
    par: 4,
    distance: 362,
    yards: 396,
    handicap: 14,
    name: "클럽하우스 피날레",
    elevation: "완만한 오르막 +5m",
    hazards: ["센트럴 레이크 폰드", "그린 좌우 갤러리 벙커"],
    tip: "센트럴 호수를 지나 클럽하우스 정면 그린으로 복귀하는 드라마틱한 최종 피니시 홀입니다. 핀 앞쪽 둔덕을 감안해 넉넉한 세컨드 샷을 추천합니다.",
    recommendClub: "1W (220m) → 8I (135m 피니시)",
    landingWidth: "43m (클럽하우스 뷰)",
    fairwayAccuracy: "85%",
    teeBox: { x: 506, y: 446 },
    landing: { x: 486, y: 376 },
    green: { x: 476, y: 296 },
    pin: { x: 474, y: 294 },
    badge: { x: 516, y: 382 },
    fairwayPath: "M 512 446 C 496 406 486 366 476 306 C 466 296 486 296 496 352 C 506 392 516 426 522 446 Z",
    greenPath: "M 476 296 m -17 0 a 17 14 0 1 0 34 0 a 17 14 0 1 0 -34 0",
    bunkers: [
      "M 496 366 C 506 360 512 370 506 378 C 496 378 492 372 496 366 Z",
      "M 460 296 C 468 290 474 298 468 306 C 460 306 456 300 460 296 Z",
    ],
    shotTrajectory: "M 506 446 Q 486 376 474 294",
  },
];

// 지형 조경 수목 군락 데이터
const TREE_GROVES = [
  { x: 50, y: 80, r: 24 },
  { x: 75, y: 65, r: 18 },
  { x: 100, y: 80, r: 22 },
  { x: 175, y: 45, r: 20 },
  { x: 200, y: 35, r: 24 },
  { x: 235, y: 40, r: 18 },
  { x: 320, y: 30, r: 22 },
  { x: 445, y: 55, r: 26 },
  { x: 480, y: 45, r: 20 },
  { x: 510, y: 60, r: 24 },
  { x: 600, y: 40, r: 22 },
  { x: 730, y: 35, r: 25 },
  { x: 765, y: 25, r: 20 },
  { x: 810, y: 45, r: 26 },
  { x: 935, y: 60, r: 28 },
  { x: 960, y: 95, r: 24 },
  { x: 950, y: 150, r: 22 },
  { x: 940, y: 280, r: 26 },
  { x: 960, y: 320, r: 24 },
  { x: 920, y: 380, r: 28 },
  { x: 880, y: 440, r: 24 },
  { x: 840, y: 480, r: 22 },
  { x: 770, y: 510, r: 26 },
  { x: 720, y: 540, r: 24 },
  { x: 640, y: 530, r: 26 },
  { x: 580, y: 545, r: 22 },
  { x: 470, y: 535, r: 28 },
  { x: 380, y: 520, r: 26 },
  { x: 290, y: 530, r: 24 },
  { x: 210, y: 535, r: 26 },
  { x: 110, y: 520, r: 28 },
  { x: 50, y: 480, r: 26 },
  { x: 45, y: 380, r: 24 },
  { x: 35, y: 280, r: 26 },
  { x: 45, y: 180, r: 25 },
  { x: 260, y: 155, r: 18 },
  { x: 285, y: 145, r: 16 },
  { x: 340, y: 255, r: 15 },
  { x: 455, y: 135, r: 16 },
  { x: 525, y: 125, r: 18 },
  { x: 670, y: 175, r: 17 },
  { x: 730, y: 140, r: 16 },
  { x: 815, y: 225, r: 19 },
  { x: 640, y: 360, r: 16 },
  { x: 620, y: 410, r: 17 },
  { x: 440, y: 480, r: 18 },
  { x: 225, y: 385, r: 16 },
];

export default function CourseMap({ courseName = "그린힐스 파크 컨트리클럽" }) {
  // styleMode: "drone" (방향 B: 모던 드론 HUD 뷰 - 기본값), "yardage" (방향 A: 클래식 야디지북 마스터플랜)
  const [styleMode, setStyleMode] = useState("drone");
  const [courseSide, setCourseSide] = useState("all");
  const [selectedHoleNumber, setSelectedHoleNumber] = useState(1);
  const [hoveredHoleNumber, setHoveredHoleNumber] = useState(null);

  const selectedHole = useMemo(
    () => HOLES.find((h) => h.number === selectedHoleNumber) || HOLES[0],
    [selectedHoleNumber]
  );

  const visibleHoles = useMemo(() => {
    if (courseSide === "out") return HOLES.slice(0, 9);
    if (courseSide === "in") return HOLES.slice(9);
    return HOLES;
  }, [courseSide]);

  function handleSideChange(side) {
    setCourseSide(side);
    if (side === "out" && selectedHoleNumber > 9) setSelectedHoleNumber(1);
    if (side === "in" && selectedHoleNumber < 10) setSelectedHoleNumber(10);
  }

  const isDrone = styleMode === "drone";

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      aria-labelledby="course-map-heading"
    >
      {/* 카드 쉘 */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors duration-300">
        {/* 상단 헤더: 타이틀 & 스타일 모드 전환 & 구간 필터 */}
        <header className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold tracking-wider transition-colors ${
                  isDrone
                    ? "bg-cyan-500/15 text-cyan-600 dark:bg-cyan-400/15 dark:text-cyan-300"
                    : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                }`}
              >
                {isDrone ? "MODERN DRONE HUD (B)" : "CLASSIC YARDAGE (A)"}
              </span>
              <span className="text-xs text-muted-foreground">· 18H / PAR 72</span>
            </div>
            <h2
              id="course-map-heading"
              className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              2D 인터랙티브 코스맵
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {isDrone
                ? "하이테크 모던 드론 뷰와 스마트 텔레메트리(비거리·랜딩폭·추천클럽) 분석을 제공합니다."
                : "위에서 내려다본 공식 야디지북 배치도입니다. 홀을 선택해 동선과 공략을 확인하세요."}
            </p>
          </div>

          {/* 우측 컨트롤 바: 디자인 스타일 스위처(B vs A) & 코스 구간 필터 */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 디자인 스타일 스위처 (A / B 비교) */}
            <div
              className="flex items-center rounded-xl bg-muted p-1 text-xs font-semibold"
              role="group"
              aria-label="지도 디자인 스타일 선택"
            >
              <button
                type="button"
                onClick={() => setStyleMode("drone")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  isDrone
                    ? "bg-cyan-600 text-white shadow-sm dark:bg-cyan-500 dark:text-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={isDrone}
              >
                <span>⚡ 모던 드론 (B)</span>
              </button>
              <button
                type="button"
                onClick={() => setStyleMode("yardage")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  !isDrone
                    ? "bg-emerald-700 text-white shadow-sm dark:bg-emerald-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={!isDrone}
              >
                <span>🌿 클래식 (A)</span>
              </button>
            </div>

            {/* 코스 구간 필터 Segmented Control */}
            <div
              role="radiogroup"
              aria-label="코스 구간 필터"
              className="flex items-center rounded-xl bg-muted p-1 text-xs font-semibold"
            >
              {[
                { id: "all", label: "전체 18H" },
                { id: "out", label: "OUT 1–9" },
                { id: "in", label: "IN 10–18" },
              ].map(({ id, label }) => {
                const active = courseSide === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSideChange(id)}
                    className={`relative rounded-lg px-3 py-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* 메인 뷰: 데스크톱 지도 70% + 야디지 패널 30% / 모바일 상하 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
          {/* 좌측: 인터랙티브 항공 SVG 맵 컨테이너 */}
          <div
            className={`relative flex flex-col justify-between overflow-hidden p-2 transition-colors duration-500 sm:p-4 ${
              isDrone ? "bg-[#091118]" : "bg-[#223926]"
            }`}
          >
            {/* 상단 오버레이 안내 뱃지 */}
            <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md ${
                  isDrone
                    ? "border border-cyan-500/30 bg-black/75 text-cyan-300"
                    : "bg-black/60 text-emerald-200"
                }`}
              >
                {courseName}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-[10px] backdrop-blur-md ${
                  isDrone
                    ? "border border-cyan-500/20 bg-cyan-950/40 text-cyan-400 font-mono"
                    : "bg-black/40 text-zinc-300"
                }`}
              >
                {isDrone ? "SENSOR: 4K TOP-DOWN · LAT 37°28'N" : "가상 코스 마스터플랜"}
              </span>
            </div>

            {/* 모바일 가로 스크롤 가능 컨테이너 */}
            <div className="relative w-full overflow-x-auto pb-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand">
              <div className="min-w-[700px] select-none lg:min-w-0">
                <svg
                  viewBox="0 0 1000 620"
                  className="h-auto w-full"
                  role="img"
                  aria-label={`${courseName} 18홀 ${isDrone ? "모던 드론 HUD" : "2D 항공"} 코스맵`}
                >
                  <defs>
                    {/* [모던 드론 HUD B 스타일 전용 Defs] */}
                    <linearGradient id="droneDarkBase" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0b131c" />
                      <stop offset="50%" stopColor="#101c27" />
                      <stop offset="100%" stopColor="#081018" />
                    </linearGradient>

                    <linearGradient id="droneFairwayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0f766e" />
                      <stop offset="100%" stopColor="#064e3b" />
                    </linearGradient>

                    <linearGradient id="droneFairwaySelected" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>

                    <linearGradient id="droneWaterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="50%" stopColor="#0369a1" />
                      <stop offset="100%" stopColor="#082f49" />
                    </linearGradient>

                    <linearGradient id="droneBunkerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#e2d9c2" />
                      <stop offset="100%" stopColor="#c5baa0" />
                    </linearGradient>

                    <filter id="droneNeonGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
                      <feFlood floodColor="#38bdf8" floodOpacity="0.85" result="color" />
                      <feComposite in2="blur" operator="in" result="shadow" />
                      <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <pattern id="droneRadarGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="30" x2="60" y2="30" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.08" />
                      <line x1="30" y1="0" x2="30" y2="60" stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.08" />
                      <circle cx="30" cy="30" r="1.5" fill="#38bdf8" fillOpacity="0.25" />
                    </pattern>

                    {/* [클래식 야디지북 A 스타일 전용 Defs] */}
                    <linearGradient id="roughGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2c4b32" />
                      <stop offset="50%" stopColor="#25422b" />
                      <stop offset="100%" stopColor="#1f3623" />
                    </linearGradient>

                    <linearGradient id="fairwayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#82b753" />
                      <stop offset="100%" stopColor="#679a3c" />
                    </linearGradient>

                    <linearGradient id="selectedFairwayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a3e665" />
                      <stop offset="100%" stopColor="#76b83f" />
                    </linearGradient>

                    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3d82a6" />
                      <stop offset="50%" stopColor="#286280" />
                      <stop offset="100%" stopColor="#194860" />
                    </linearGradient>

                    <linearGradient id="bunkerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f3e8d0" />
                      <stop offset="100%" stopColor="#d9c7a2" />
                    </linearGradient>

                    <radialGradient id="treeShade" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#2c5132" />
                      <stop offset="70%" stopColor="#19351d" />
                      <stop offset="100%" stopColor="#0f2212" />
                    </radialGradient>

                    <filter id="fairwayGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
                      <feFlood floodColor="#ffd54f" floodOpacity="0.75" result="color" />
                      <feComposite in2="blur" operator="in" result="shadow" />
                      <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>

                    <filter id="badgeGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
                    </filter>

                    <pattern id="contourPattern" width="120" height="80" patternUnits="userSpaceOnUse">
                      <path
                        d="M -20 40 Q 30 10, 80 50 T 180 30"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="0.75"
                        strokeOpacity="0.06"
                      />
                      <path
                        d="M 10 90 Q 60 60, 110 80 T 210 70"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="0.75"
                        strokeOpacity="0.04"
                      />
                    </pattern>
                  </defs>

                  {/* 1. 베이스 지형 & 그리드/등고선 */}
                  <rect
                    width="1000"
                    height="620"
                    rx="16"
                    fill={isDrone ? "url(#droneDarkBase)" : "url(#roughGrad)"}
                  />
                  <rect
                    width="1000"
                    height="620"
                    rx="16"
                    fill={isDrone ? "url(#droneRadarGrid)" : "url(#contourPattern)"}
                  />

                  {/* B 모던 드론 뷰 전용: 레이더 동심원 및 HUD 코너 가이드 */}
                  {isDrone && (
                    <g id="drone-hud-decorations" pointerEvents="none" opacity="0.45">
                      <circle cx="500" cy="310" r="280" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="4 8" />
                      <circle cx="500" cy="310" r="160" fill="none" stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="2 6" />
                      <line x1="500" y1="20" x2="500" y2="40" stroke="#38bdf8" strokeWidth="1.5" />
                      <line x1="500" y1="580" x2="500" y2="600" stroke="#38bdf8" strokeWidth="1.5" />
                      <line x1="20" y1="310" x2="40" y2="310" stroke="#38bdf8" strokeWidth="1.5" />
                      <line x1="960" y1="310" x2="980" y2="310" stroke="#38bdf8" strokeWidth="1.5" />
                      <text x="500" y="32" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">N 360°</text>
                    </g>
                  )}

                  {/* 2. 대자연 호수 (Water Hazards) */}
                  <g id="water-hazards">
                    {/* 센트럴 레이크 */}
                    <path
                      d="M 400 340 C 450 310 520 325 570 355 C 600 395 565 440 500 435 C 445 430 385 390 400 340 Z"
                      fill={isDrone ? "url(#droneWaterGrad)" : "url(#waterGrad)"}
                      stroke={isDrone ? "#38bdf8" : "#4ea3cc"}
                      strokeWidth={isDrone ? "2.5" : "2"}
                      strokeOpacity={isDrone ? "0.7" : "0.4"}
                    />
                    {isDrone && (
                      <path
                        d="M 425 355 C 465 335 515 345 540 370"
                        fill="none"
                        stroke="#7dd3fc"
                        strokeWidth="1.5"
                        strokeDasharray="4 8"
                        strokeOpacity="0.7"
                      />
                    )}

                    {/* 웨스트 레이크 */}
                    <path
                      d="M 135 395 C 185 375 235 405 225 455 C 205 490 145 495 115 455 C 100 420 115 398 135 395 Z"
                      fill={isDrone ? "url(#droneWaterGrad)" : "url(#waterGrad)"}
                      stroke={isDrone ? "#38bdf8" : "#4ea3cc"}
                      strokeWidth={isDrone ? "2.5" : "2"}
                      strokeOpacity={isDrone ? "0.7" : "0.4"}
                    />

                    {/* 이스트 밸리 레이크 */}
                    <path
                      d="M 790 190 C 850 165 915 185 895 240 C 875 285 815 270 775 235 C 765 205 775 195 790 190 Z"
                      fill={isDrone ? "url(#droneWaterGrad)" : "url(#waterGrad)"}
                      stroke={isDrone ? "#38bdf8" : "#4ea3cc"}
                      strokeWidth={isDrone ? "2.5" : "2"}
                      strokeOpacity={isDrone ? "0.7" : "0.4"}
                    />

                    {/* 7번 홀 미니 크릭 폰드 */}
                    <path
                      d="M 245 235 C 275 225 290 248 280 272 C 262 288 238 278 232 258 C 230 242 240 236 245 235 Z"
                      fill={isDrone ? "url(#droneWaterGrad)" : "url(#waterGrad)"}
                      stroke={isDrone ? "#38bdf8" : "#4ea3cc"}
                      strokeWidth="1.5"
                      strokeOpacity="0.5"
                    />
                  </g>

                  {/* 3. 카트 도로망 (Cart Paths) */}
                  <g id="cart-paths" opacity={isDrone ? "0.45" : "0.6"}>
                    <path
                      d="M 445 285 C 380 300 320 350 250 410 C 190 435 125 435 95 380 C 70 300 80 200 115 115 C 160 85 240 60 310 65 C 360 80 415 95 435 130"
                      fill="none"
                      stroke={isDrone ? "#475569" : "#e5dfd2"}
                      strokeWidth={isDrone ? "2" : "3"}
                      strokeLinecap="round"
                    />
                    <path
                      d="M 525 285 C 590 305 670 325 730 350 C 800 365 870 340 890 280 C 910 210 890 140 840 85 C 770 55 690 55 620 85 C 575 115 540 160 525 210"
                      fill="none"
                      stroke={isDrone ? "#475569" : "#e5dfd2"}
                      strokeWidth={isDrone ? "2" : "3"}
                      strokeLinecap="round"
                    />
                  </g>

                  {/* 4. 클럽하우스 & 스타팅 파빌리온 */}
                  <g id="clubhouse" transform="translate(450, 235)">
                    <ellipse cx="-20" cy="40" rx="18" ry="12" fill={isDrone ? "#0d9488" : "#9de06c"} stroke={isDrone ? "#2dd4bf" : "#487834"} strokeWidth="1.5" />
                    <circle cx="-20" cy="40" r="2" fill="#faf7e8" />
                    <ellipse cx="90" cy="40" rx="18" ry="12" fill={isDrone ? "#0d9488" : "#9de06c"} stroke={isDrone ? "#2dd4bf" : "#487834"} strokeWidth="1.5" />
                    <circle cx="90" cy="40" r="2" fill="#faf7e8" />

                    <rect x="0" y="0" width="70" height="42" rx="6" fill={isDrone ? "#1e293b" : "#4a463d"} stroke={isDrone ? "#38bdf8" : "none"} strokeWidth="1" />
                    <polygon points="0,0 35,-15 70,0" fill={isDrone ? "#0f172a" : "#7a543b"} />
                    <rect x="8" y="8" width="54" height="26" rx="3" fill={isDrone ? "#0f172a" : "#cfc7b4"} />
                    <text
                      x="35"
                      y="24"
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="800"
                      letterSpacing="0.1em"
                      fill={isDrone ? "#38bdf8" : "#2f2d26"}
                    >
                      {isDrone ? "HQ CENTER" : "CLUB HOUSE"}
                    </text>
                  </g>

                  {/* 5. 숲 수목 군락 (Tree Groves) */}
                  <g id="tree-groves" opacity={isDrone ? "0.7" : "0.9"}>
                    {TREE_GROVES.map((tree, idx) => (
                      <circle
                        key={idx}
                        cx={tree.x}
                        cy={tree.y}
                        r={tree.r}
                        fill={isDrone ? "#041a14" : "url(#treeShade)"}
                        stroke={isDrone ? "#064e3b" : "none"}
                        strokeWidth={isDrone ? "0.75" : "0"}
                        opacity={isDrone ? "0.9" : "0.88"}
                      />
                    ))}
                  </g>

                  {/* 6. 18홀 코스 레이어 (티박스, 페어웨이, 벙커, 그린, 샷가이드, 핀) */}
                  <g id="holes-layer">
                    {HOLES.map((hole) => {
                      const isSelected = hole.number === selectedHoleNumber;
                      const isHovered = hole.number === hoveredHoleNumber;
                      const isVisible = visibleHoles.some((h) => h.number === hole.number);

                      const holeOpacity = isVisible
                        ? isSelected
                          ? 1
                          : hoveredHoleNumber && !isHovered
                          ? 0.32
                          : selectedHoleNumber && !isSelected
                          ? isDrone
                            ? 0.38
                            : 0.42
                          : 0.85
                        : 0.1;

                      return (
                        <g
                          key={hole.number}
                          id={`hole-${hole.number}`}
                          opacity={holeOpacity}
                          className="transition-opacity duration-300 ease-in-out"
                        >
                          {/* (1) 페어웨이 (유기적인 도그레그 베지에 폴리곤) */}
                          <path
                            d={hole.fairwayPath}
                            fill={
                              isDrone
                                ? isSelected
                                  ? "url(#droneFairwaySelected)"
                                  : "url(#droneFairwayGrad)"
                                : isSelected
                                ? "url(#selectedFairwayGrad)"
                                : "url(#fairwayGrad)"
                            }
                            stroke={
                              isDrone
                                ? isSelected
                                  ? "#38bdf8"
                                  : isHovered
                                  ? "#2dd4bf"
                                  : "#0d9488"
                                : isSelected
                                ? "#ffd54f"
                                : isHovered
                                ? "#d4e157"
                                : "#477432"
                            }
                            strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                            strokeLinejoin="round"
                            filter={
                              isSelected
                                ? isDrone
                                  ? "url(#droneNeonGlow)"
                                  : "url(#fairwayGlow)"
                                : undefined
                            }
                            className="cursor-pointer transition-all duration-200"
                            onClick={() => setSelectedHoleNumber(hole.number)}
                            onMouseEnter={() => setHoveredHoleNumber(hole.number)}
                            onMouseLeave={() => setHoveredHoleNumber(null)}
                          />

                          {/* (2) 모래 벙커 (Bunkers) */}
                          {hole.bunkers.map((bunkerPath, bIdx) => (
                            <path
                              key={bIdx}
                              d={bunkerPath}
                              fill={isDrone ? "url(#droneBunkerGrad)" : "url(#bunkerGrad)"}
                              stroke={isDrone ? "#94a3b8" : "#a89571"}
                              strokeWidth="1"
                              className="pointer-events-none"
                            />
                          ))}

                          {/* (3) 티잉 그라운드 (Tee Box) */}
                          <g
                            transform={`translate(${hole.teeBox.x}, ${hole.teeBox.y})`}
                            className="pointer-events-none"
                          >
                            <rect
                              x="-6"
                              y="-4"
                              width="12"
                              height="8"
                              rx="2"
                              fill={isDrone ? "#0f172a" : "#385e2b"}
                              stroke={isDrone ? "#38bdf8" : "#8ec06c"}
                              strokeWidth="1"
                            />
                            <circle cx="-2.5" cy="0" r="1.2" fill="#ffffff" />
                            <circle cx="2.5" cy="0" r="1.2" fill={isDrone ? "#38bdf8" : "#2563eb"} />
                          </g>

                          {/* (4) 퍼팅 그린 (Putting Green) */}
                          <path
                            d={hole.greenPath}
                            fill={isDrone ? "#34d399" : "#a4e76c"}
                            stroke={isDrone ? "#10b981" : "#366524"}
                            strokeWidth="2"
                            className="pointer-events-none"
                          />

                          {/* (5) 선택된 홀 전용: 정밀 샷 궤적선 (Shot Trajectory / Laser Tracer) */}
                          {isSelected && (
                            <g className="pointer-events-none">
                              {/* 샷 궤적 라인 */}
                              <path
                                d={hole.shotTrajectory}
                                fill="none"
                                stroke={isDrone ? "#38bdf8" : "#ffd54f"}
                                strokeWidth={isDrone ? 3.5 : 3}
                                strokeDasharray={isDrone ? "8 4" : "6 6"}
                                strokeLinecap="round"
                                opacity="0.95"
                              />

                              {/* 1차 랜딩 타겟 링 & 레이더 HUD */}
                              <circle
                                cx={hole.landing.x}
                                cy={hole.landing.y}
                                r={isDrone ? 12 : 9}
                                fill="none"
                                stroke={isDrone ? "#38bdf8" : "#ffd54f"}
                                strokeWidth="1.5"
                                strokeDasharray={isDrone ? "3 3" : "none"}
                                opacity="0.85"
                              />
                              <circle
                                cx={hole.landing.x}
                                cy={hole.landing.y}
                                r="3.5"
                                fill={isDrone ? "#38bdf8" : "#ffd54f"}
                              />

                              {/* B 모던 드론 HUD 전용: 레이더 타겟 마커 텍스트 */}
                              {isDrone && (
                                <g transform={`translate(${hole.landing.x + 10}, ${hole.landing.y - 10})`}>
                                  <rect x="0" y="0" width="62" height="15" rx="3" fill="#0284c7" fillOpacity="0.85" />
                                  <text x="31" y="11" textAnchor="middle" fontSize="8" fontWeight="800" fill="#ffffff" fontFamily="monospace">
                                    CARRY 225M
                                  </text>
                                </g>
                              )}

                              {/* 2차 랜딩 타겟 (파5 홀) */}
                              {hole.landing2 && (
                                <>
                                  <circle
                                    cx={hole.landing2.x}
                                    cy={hole.landing2.y}
                                    r={isDrone ? 12 : 9}
                                    fill="none"
                                    stroke={isDrone ? "#38bdf8" : "#ffd54f"}
                                    strokeWidth="1.5"
                                    strokeDasharray={isDrone ? "3 3" : "none"}
                                    opacity="0.85"
                                  />
                                  <circle
                                    cx={hole.landing2.x}
                                    cy={hole.landing2.y}
                                    r="3.5"
                                    fill={isDrone ? "#38bdf8" : "#ffd54f"}
                                  />
                                  {isDrone && (
                                    <g transform={`translate(${hole.landing2.x + 10}, ${hole.landing2.y - 10})`}>
                                      <rect x="0" y="0" width="58" height="15" rx="3" fill="#0f766e" fillOpacity="0.85" />
                                      <text x="29" y="11" textAnchor="middle" fontSize="8" fontWeight="800" fill="#ffffff" fontFamily="monospace">
                                        LAYUP 210M
                                      </text>
                                    </g>
                                  )}
                                </>
                              )}
                            </g>
                          )}

                          {/* (6) 깃대와 핀 플래그 (Pin Flag) */}
                          <g transform={`translate(${hole.pin.x}, ${hole.pin.y})`} className="pointer-events-none">
                            <line x1="0" y1="0" x2="0" y2="-12" stroke="#ffffff" strokeWidth="1.5" />
                            <polygon
                              points="0,-12 8,-9 0,-6"
                              fill={isDrone ? (isSelected ? "#38bdf8" : "#0284c7") : (isSelected ? "#ff334b" : "#e11d48")}
                            />
                            <circle cx="0" cy="0" r="2.2" fill="#111827" />
                          </g>

                          {/* (7) 홀 번호 뱃지 버튼 */}
                          <g
                            transform={`translate(${hole.badge.x}, ${hole.badge.y})`}
                            onClick={() => setSelectedHoleNumber(hole.number)}
                            onMouseEnter={() => setHoveredHoleNumber(hole.number)}
                            onMouseLeave={() => setHoveredHoleNumber(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedHoleNumber(hole.number);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`${hole.number}번 홀, 파 ${hole.par}, ${hole.distance}미터, 핸디캡 ${hole.handicap}`}
                            aria-pressed={isSelected}
                            className="cursor-pointer outline-none focus-visible:scale-125"
                            filter={!isDrone ? "url(#badgeGlow)" : undefined}
                          >
                            <circle
                              r={isSelected ? 14 : 12}
                              fill={
                                isDrone
                                  ? isSelected
                                    ? "#0284c7"
                                    : isHovered
                                    ? "#0f766e"
                                    : "#0f172a"
                                  : isSelected
                                  ? "#183b23"
                                  : isHovered
                                  ? "#2a5435"
                                  : "#ffffff"
                              }
                              stroke={
                                isDrone
                                  ? isSelected
                                    ? "#38bdf8"
                                    : isHovered
                                    ? "#2dd4bf"
                                    : "#334155"
                                  : isSelected
                                  ? "#ffd54f"
                                  : isHovered
                                  ? "#82b753"
                                  : "#1f4329"
                              }
                              strokeWidth={isSelected ? 3 : 1.5}
                              className="transition-all duration-200"
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={isSelected ? "11" : "10"}
                              fontWeight="800"
                              fill={
                                isDrone
                                  ? isSelected
                                    ? "#ffffff"
                                    : isHovered
                                    ? "#ffffff"
                                    : "#94a3b8"
                                  : isSelected
                                  ? "#ffffff"
                                  : isHovered
                                  ? "#ffffff"
                                  : "#183b23"
                              }
                            >
                              {hole.number}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
            </div>

            {/* 하단 범례 (Legend) */}
            <div
              className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs backdrop-blur-md ${
                isDrone
                  ? "border border-cyan-500/20 bg-black/60 text-slate-200"
                  : "bg-black/40 text-zinc-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-4 rounded-sm ${isDrone ? "bg-[#10b981]" : "bg-[#82b753]"}`} /> 페어웨이
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-3 rounded-full ${isDrone ? "bg-[#34d399]" : "bg-[#a4e76c]"}`} /> 그린
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-3.5 rounded-sm ${isDrone ? "bg-[#0284c7]" : "bg-[#3d82a6]"}`} /> 워터 해저드
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-3 rounded-full ${isDrone ? "bg-[#e2d9c2]" : "bg-[#f3e8d0]"}`} /> 벙커
                </span>
                <span className="flex items-center gap-1.5">
                  <span className={`h-0.5 w-3.5 border-t-2 border-dashed ${isDrone ? "border-[#38bdf8]" : "border-[#ffd54f]"}`} /> 공략선
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                💡 모바일에서 지도를 좌우로 스크롤할 수 있습니다.
              </span>
            </div>
          </div>

          {/* 우측: 정돈된 스마트 텔레메트리 / 야디지북 정보 패널 */}
          <aside
            className="flex flex-col justify-between border-t border-border bg-card p-5 lg:border-l lg:border-t-0 sm:p-6"
            aria-live="polite"
          >
            <div>
              {/* 홀 번호 및 PAR 헤더 */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {isDrone ? "FLIGHT TELEMETRY" : "HOLE"}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {selectedHole.side.toUpperCase()} COURSE
                    </span>
                  </div>
                  <p className="mt-0.5 text-5xl font-black tracking-tight text-foreground">
                    {selectedHole.number}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-3.5 py-1 text-sm font-bold shadow-sm ${
                      isDrone
                        ? "bg-cyan-600 text-white dark:bg-cyan-500 dark:text-black"
                        : "bg-brand text-brand-foreground"
                    }`}
                  >
                    PAR {selectedHole.par}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    HCP {selectedHole.handicap}
                  </span>
                </div>
              </div>

              {/* 홀 명칭 */}
              <h3 className="mt-3 text-base font-bold text-foreground">
                {selectedHole.name}
              </h3>

              {/* 거리 및 스펙 지표 */}
              <dl className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <dt className="text-xs text-muted-foreground">전장 거리</dt>
                  <dd className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold tracking-tight text-foreground">
                      {selectedHole.distance}m
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({selectedHole.yards}yd)
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
                  <dt className="text-xs text-muted-foreground">고저차 / 지형</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">
                    {selectedHole.elevation}
                  </dd>
                </div>
              </dl>

              {/* B 모던 드론 HUD 전용: 스마트 텔레메트리 추천 박스 */}
              {isDrone && (
                <div className="mt-3.5 space-y-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">🏌️ 권장 클럽 루트</span>
                    <span className="font-bold text-cyan-500 dark:text-cyan-400">
                      {selectedHole.recommendClub}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">🎯 랜딩존 폭 / 안정도</span>
                    <span className="font-bold text-foreground">
                      {selectedHole.landingWidth} ({selectedHole.fairwayAccuracy})
                    </span>
                  </div>
                </div>
              )}

              {/* 주의 위험 요소 (Hazards) */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground">주요 위험 요소</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedHole.hazards.map((hazard, hIdx) => (
                    <span
                      key={hIdx}
                      className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive dark:bg-destructive/20"
                    >
                      ⚠️ {hazard}
                    </span>
                  ))}
                </div>
              </div>

              {/* 공략 가이드 */}
              <div
                className={`mt-4 rounded-xl border p-3.5 ${
                  isDrone
                    ? "border-cyan-500/20 bg-cyan-500/5"
                    : "border-brand/20 bg-brand/5"
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    isDrone ? "text-cyan-600 dark:text-cyan-400" : "text-brand"
                  }`}
                >
                  <span>{isDrone ? "⚡ 텍티컬 전술 브리핑" : "⛳ 캐디 코스 가이드"}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/90 sm:text-sm">
                  {selectedHole.tip}
                </p>
              </div>
            </div>

            {/* 18홀 빠른 선택 매트릭스 */}
            <div className="mt-6 border-t border-border pt-4">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>홀 바로가기</span>
                <span>{selectedHole.number}번 홀 선택됨</span>
              </div>

              <div
                className="mt-2.5 grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-6"
                aria-label="18홀 전체 선택 버튼 목록"
              >
                {HOLES.map((hole) => {
                  const isCurrent = hole.number === selectedHoleNumber;
                  const isInSide = visibleHoles.some((h) => h.number === hole.number);

                  return (
                    <button
                      key={hole.number}
                      type="button"
                      onClick={() => setSelectedHoleNumber(hole.number)}
                      aria-label={`${hole.number}번 홀 선택`}
                      aria-pressed={isCurrent}
                      className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-bold transition-all ${
                        isCurrent
                          ? isDrone
                            ? "bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-500/50 dark:bg-cyan-500 dark:text-black"
                            : "bg-brand text-brand-foreground shadow-sm ring-2 ring-brand/40"
                          : isInSide
                          ? "bg-muted text-foreground hover:bg-accent"
                          : "bg-muted/40 text-muted-foreground/40 hover:bg-muted"
                      }`}
                    >
                      {hole.number}
                    </button>
                  );
                })}
              </div>

              {/* 안내 각주 */}
              <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
                ※ 본 코스맵은 인터랙티브 코스 가이드 시연용 샘플입니다.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
