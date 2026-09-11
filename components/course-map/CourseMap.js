"use client";

import { useMemo, useState } from "react";

// 18홀 코스 상세 스펙 및 정밀 야디지 데이터
const HOLES = [
  {
    number: 1,
    side: "out",
    par: 4,
    distance: 382,
    yards: 418,
    handicap: 7,
    name: "스타팅 페어웨이",
    dogleg: "slight-left",
    elevation: "완만한 내리막 -3m",
    hazards: ["우측 페어웨이 벙커 210m", "좌측 가드 벙커"],
    tip: "클럽하우스에서 출발하는 첫 홀입니다. 오른쪽 벙커 좌측으로 티샷을 보내면 세컨드 그린 시야가 가장 깨끗하게 열립니다.",
    recommendClub: "1W (230m) → 8I (145m)",
    landingWidth: "46m (넓음)",
    fairwayAccuracy: "88%",
    // 마스터플랜 전체 좌표
    teeBox: { x: 415, y: 275 },
    landing: { x: 350, y: 330 },
    green: { x: 282, y: 382 },
    pin: { x: 280, y: 379 },
    badge: { x: 352, y: 308 },
    fairwayPath: "M 425 268 C 390 288 360 305 335 328 C 305 356 284 372 260 392 C 278 406 312 390 346 362 C 382 344 420 312 438 280 Z",
    greenPath: "M 282 382 m -22 0 a 22 18 0 1 0 44 0 a 22 18 0 1 0 -44 0",
    bunkers: [
      "M 374 300 C 388 292 402 305 394 320 C 380 328 370 314 374 300 Z",
      "M 262 374 C 272 364 284 374 276 388 C 266 390 258 382 262 374 Z",
    ],
    shotTrajectory: "M 415 275 Q 355 328 280 379",
    // 홀 집중 정밀 뷰 데이터 (로컬 좌표계 1000x620)
    detail: {
      fairway: "M 150 285 C 280 270 420 255 580 250 C 700 245 800 260 880 290 C 860 350 720 375 580 370 C 420 365 280 350 150 335 Z",
      green: "M 880 290 m -34 0 a 34 26 0 1 0 68 0 a 34 26 0 1 0 -68 0",
      pin: { x: 885, y: 286 },
      landing1: { x: 520, y: 305, label: "IP1 (225m)" },
      bunkers: [
        { d: "M 530 230 C 560 220 580 235 570 255 C 550 265 525 250 530 230 Z", label: "페어웨이 벙커 210m" },
        { d: "M 850 250 C 875 240 890 255 880 270 C 865 275 845 265 850 250 Z", label: "가드 벙커" },
      ],
      hazardWater: null,
      crossSection: "M 150 550 Q 520 560 880 570",
    }
  },
  {
    number: 2,
    side: "out",
    par: 3,
    distance: 164,
    yards: 179,
    handicap: 15,
    name: "웨스트 레이크 폰드",
    dogleg: "straight",
    elevation: "평지 +1m",
    hazards: ["전면 웨스트 레이크 해저드", "그린 우측 샌드 트랩"],
    tip: "호수를 직접 넘겨야 하는 아름다운 파 3 홀입니다. 맞바람이 잦으므로 한 클럽 여유 있게 잡고 그린 중앙을 공략하세요.",
    recommendClub: "6I (155m 핀 직접 공략)",
    landingWidth: "그린 직경 28m",
    fairwayAccuracy: "74%",
    teeBox: { x: 242, y: 418 },
    landing: { x: 198, y: 432 },
    green: { x: 154, y: 446 },
    pin: { x: 152, y: 443 },
    badge: { x: 202, y: 402 },
    fairwayPath: "M 245 410 C 205 420 180 426 152 432 C 140 456 168 468 198 456 C 226 444 254 434 252 416 Z",
    greenPath: "M 154 446 m -20 0 a 20 17 0 1 0 40 0 a 20 17 0 1 0 -40 0",
    bunkers: [
      "M 172 432 C 184 426 192 438 184 448 C 174 450 168 440 172 432 Z",
    ],
    shotTrajectory: "M 242 418 Q 198 432 152 443",
    detail: {
      fairway: "M 150 280 C 260 270 340 270 420 280 C 410 340 330 350 240 340 C 180 330 150 320 150 280 Z",
      green: "M 830 300 m -36 0 a 36 28 0 1 0 72 0 a 36 28 0 1 0 -72 0",
      pin: { x: 835, y: 295 },
      landing1: { x: 830, y: 300, label: "TARGET PIN (164m)" },
      bunkers: [
        { d: "M 800 255 C 830 245 845 260 835 275 C 815 280 795 270 800 255 Z", label: "우측 가드 벙커" }
      ],
      hazardWater: "M 390 220 C 580 190 760 210 800 290 C 780 380 600 410 420 380 C 370 320 360 260 390 220 Z",
      crossSection: "M 150 550 L 830 545",
    }
  },
  {
    number: 3,
    side: "out",
    par: 5,
    distance: 512,
    yards: 560,
    handicap: 3,
    name: "웨스턴 리지 롱홀",
    dogleg: "slight-right",
    elevation: "완만한 오르막 +6m",
    hazards: ["1차 랜딩존 우측 벙커", "2차 랜딩존 좌측 숲", "그린사이드 팟 벙커"],
    tip: "서쪽 능선을 따라 북쪽으로 길게 뻗은 핸디캡 3번 롱홀입니다. 무리한 2온보다는 안전한 3온 레이업 전략이 확실한 파를 보장합니다.",
    recommendClub: "1W (225m) → 3W (210m) → PW (75m)",
    landingWidth: "38m (적정)",
    fairwayAccuracy: "68%",
    teeBox: { x: 104, y: 436 },
    landing: { x: 80, y: 330 },
    landing2: { x: 92, y: 225 },
    green: { x: 118, y: 128 },
    pin: { x: 116, y: 126 },
    badge: { x: 62, y: 285 },
    fairwayPath: "M 106 438 C 70 372 60 310 70 244 C 80 186 96 152 114 122 C 134 130 124 170 114 232 C 104 294 116 366 128 434 Z",
    greenPath: "M 118 128 m -20 0 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0",
    bunkers: [
      "M 94 320 C 108 310 116 324 106 338 C 92 340 88 326 94 320 Z",
      "M 104 142 C 116 134 122 146 114 154 C 102 156 98 144 104 142 Z",
    ],
    shotTrajectory: "M 104 436 Q 74 330 92 225 T 116 126",
    detail: {
      fairway: "M 130 320 C 260 290 400 270 540 275 C 680 280 780 260 880 240 C 890 300 780 340 640 345 C 500 350 360 365 130 365 Z",
      green: "M 880 240 m -32 0 a 32 25 0 1 0 64 0 a 32 25 0 1 0 -64 0",
      pin: { x: 885, y: 236 },
      landing1: { x: 440, y: 310, label: "IP1 (225m)" },
      landing2: { x: 710, y: 295, label: "IP2 (레이업 210m)" },
      bunkers: [
        { d: "M 450 245 C 475 235 490 250 480 265 C 465 270 445 260 450 245 Z", label: "IP1 우측 벙커" },
        { d: "M 845 205 C 870 195 885 210 875 225 C 860 230 840 220 845 205 Z", label: "그린사이드 팟 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 130 570 Q 500 545 880 520",
    }
  },
  {
    number: 4,
    side: "out",
    par: 4,
    distance: 354,
    yards: 387,
    handicap: 11,
    name: "노스 포레스트 턴",
    dogleg: "slight-right",
    elevation: "평지 -1m",
    hazards: ["좌측 숲속 OB", "랜딩존 좌측 크로스 벙커"],
    tip: "북쪽 숲을 감싸 안고 오른쪽으로 부드럽게 꺾이는 도그레그 홀입니다. 드라이버는 페어웨이 중앙 우측을 타겟팅하세요.",
    recommendClub: "3W (210m) → 9I (135m)",
    landingWidth: "44m (적정)",
    fairwayAccuracy: "82%",
    teeBox: { x: 136, y: 106 },
    landing: { x: 216, y: 82 },
    green: { x: 292, y: 76 },
    pin: { x: 290, y: 74 },
    badge: { x: 216, y: 56 },
    fairwayPath: "M 132 100 C 172 80 214 64 256 64 C 282 64 298 66 310 74 C 304 94 270 98 232 100 C 190 102 152 122 134 122 Z",
    greenPath: "M 292 76 m -20 0 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0",
    bunkers: [
      "M 204 58 C 218 50 228 62 218 72 C 204 72 198 62 204 58 Z",
    ],
    shotTrajectory: "M 136 106 Q 216 82 290 74",
    detail: {
      fairway: "M 140 310 C 260 295 400 280 540 260 C 680 240 780 245 870 270 C 860 330 740 350 580 360 C 420 370 280 360 140 350 Z",
      green: "M 870 270 m -34 0 a 34 26 0 1 0 68 0 a 34 26 0 1 0 -68 0",
      pin: { x: 875, y: 265 },
      landing1: { x: 520, y: 310, label: "IP1 (210m)" },
      bunkers: [
        { d: "M 500 230 C 530 220 545 235 535 250 C 515 255 495 245 500 230 Z", label: "크로스 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 140 550 L 870 552",
    }
  },
  {
    number: 5,
    side: "out",
    par: 4,
    distance: 401,
    yards: 439,
    handicap: 1,
    name: "밸리 슬로프 (시그니처)",
    dogleg: "slight-right",
    elevation: "급경사 오르막 +9m",
    hazards: ["우측 깊은 벙커밭", "2단 언듈레이션 그린"],
    tip: "핸디캡 1번의 난이도 높은 홀입니다. 오르막 경사가 심하므로 세컨드 샷 시 1~2클럽 길게 보고 핀 아래를 안전하게 노리세요.",
    recommendClub: "1W (230m) → 6I (160m 오르막)",
    landingWidth: "32m (슬로프 주의)",
    fairwayAccuracy: "64%",
    teeBox: { x: 316, y: 92 },
    landing: { x: 366, y: 142 },
    green: { x: 406, y: 196 },
    pin: { x: 404, y: 194 },
    badge: { x: 390, y: 128 },
    fairwayPath: "M 312 84 C 344 112 374 134 400 170 C 416 192 422 204 426 216 C 410 224 398 210 382 182 C 354 150 328 124 306 98 Z",
    greenPath: "M 406 196 m -20 0 a 20 18 0 1 0 40 0 a 20 18 0 1 0 -40 0",
    bunkers: [
      "M 382 126 C 396 118 406 130 396 142 C 384 144 378 132 382 126 Z",
      "M 418 190 C 428 182 436 194 428 204 C 418 206 414 196 418 190 Z",
    ],
    shotTrajectory: "M 316 92 Q 366 142 404 194",
    detail: {
      fairway: "M 140 330 C 260 320 400 300 540 280 C 680 260 780 260 880 270 C 870 330 760 350 620 370 C 460 385 300 380 140 370 Z",
      green: "M 880 270 m -35 0 a 35 27 0 1 0 70 0 a 35 27 0 1 0 -70 0",
      pin: { x: 885, y: 265 },
      landing1: { x: 510, y: 325, label: "IP1 (230m 오르막)" },
      bunkers: [
        { d: "M 520 240 C 555 225 575 245 560 265 C 540 270 515 260 520 240 Z", label: "우측 깊은 벙커" },
        { d: "M 845 230 C 870 220 885 235 875 250 C 860 255 840 245 845 230 Z", label: "그린사이드 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 140 580 L 880 500",
    }
  },
  {
    number: 6,
    side: "out",
    par: 3,
    distance: 142,
    yards: 155,
    handicap: 17,
    name: "포레스트 가든",
    dogleg: "straight",
    elevation: "내리막 -4m",
    hazards: ["그린 앞 듀얼 팟 벙커"],
    tip: "거리는 짧지만 숲에 둘러싸여 그린 주변 여유 공간이 적습니다. 핀을 직접 노리는 정교한 숏아이언 샷이 필요합니다.",
    recommendClub: "8I (135m 내리막)",
    landingWidth: "그린 직경 24m",
    fairwayAccuracy: "78%",
    teeBox: { x: 416, y: 106 },
    landing: { x: 388, y: 80 },
    green: { x: 364, y: 56 },
    pin: { x: 362, y: 54 },
    badge: { x: 412, y: 76 },
    fairwayPath: "M 420 110 C 400 92 382 76 372 60 C 356 48 350 56 362 72 C 380 92 398 114 426 118 Z",
    greenPath: "M 364 56 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0",
    bunkers: [
      "M 346 46 C 356 38 366 48 358 56 C 348 56 344 48 346 46 Z",
    ],
    shotTrajectory: "M 416 106 Q 388 80 362 54",
    detail: {
      fairway: "M 160 290 C 260 280 340 280 420 290 C 410 340 330 350 250 340 C 190 335 160 325 160 290 Z",
      green: "M 810 300 m -35 0 a 35 28 0 1 0 70 0 a 35 28 0 1 0 -70 0",
      pin: { x: 815, y: 295 },
      landing1: { x: 810, y: 300, label: "PIN (142m)" },
      bunkers: [
        { d: "M 760 255 C 790 245 805 260 795 275 C 775 280 755 270 760 255 Z", label: "앞 팟 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 160 520 L 810 560",
    }
  },
  {
    number: 7,
    side: "out",
    par: 5,
    distance: 498,
    yards: 545,
    handicap: 5,
    name: "레이크사이드 턴",
    dogleg: "slight-left",
    elevation: "완만한 내리막 -5m",
    hazards: ["중앙 좌측 연못 해저드", "페어웨이 크릭"],
    tip: "웨스트 레이크 방향으로 완만하게 내려가는 S자 도그레그 홀입니다. 세컨드 샷에서 연못 앞 안전지대에 끊어가는 3온 전략이 현명합니다.",
    recommendClub: "1W (220m) → 5W (190m) → 52° (85m)",
    landingWidth: "36m (연못 경계)",
    fairwayAccuracy: "70%",
    teeBox: { x: 336, y: 176 },
    landing: { x: 274, y: 216 },
    landing2: { x: 208, y: 262 },
    green: { x: 164, y: 322 },
    pin: { x: 162, y: 320 },
    badge: { x: 236, y: 214 },
    fairwayPath: "M 340 168 C 298 200 244 236 192 288 C 172 308 156 324 150 336 C 166 342 186 326 218 288 C 270 246 322 210 352 178 Z",
    greenPath: "M 164 322 m -20 0 a 20 18 0 1 0 40 0 a 20 18 0 1 0 -40 0",
    bunkers: [
      "M 260 198 C 274 190 282 202 272 214 C 258 214 254 202 260 198 Z",
    ],
    shotTrajectory: "M 336 176 Q 274 216 208 262 T 162 320",
    detail: {
      fairway: "M 140 310 C 280 290 420 270 560 270 C 690 270 780 285 880 290 C 870 350 760 370 620 370 C 480 370 320 360 140 350 Z",
      green: "M 880 290 m -35 0 a 35 28 0 1 0 70 0 a 35 28 0 1 0 -70 0",
      pin: { x: 885, y: 285 },
      landing1: { x: 440, y: 310, label: "IP1 (220m)" },
      landing2: { x: 690, y: 315, label: "IP2 (190m)" },
      bunkers: [
        { d: "M 450 230 C 480 220 495 235 485 250 C 465 255 445 245 450 230 Z", label: "IP1 좌측 벙커" }
      ],
      hazardWater: "M 570 365 C 640 355 700 370 720 410 C 680 440 600 440 550 410 C 540 385 550 370 570 365 Z",
      crossSection: "M 140 520 L 880 570",
    }
  },
  {
    number: 8,
    side: "out",
    par: 4,
    distance: 368,
    yards: 402,
    handicap: 9,
    name: "센트럴 크로스",
    dogleg: "straight",
    elevation: "평지 +0m",
    hazards: ["우측 센트럴 레이크", "좌측 페어웨이 벙커"],
    tip: "호수를 오른쪽에 끼고 도는 홀입니다. 슬라이스 시 워터 해저드에 빠지기 쉬우므로 페어웨이 중앙 약간 왼쪽을 안전하게 겨냥하세요.",
    recommendClub: "1W (220m) → 7I (145m)",
    landingWidth: "40m (중앙 우측)",
    fairwayAccuracy: "80%",
    teeBox: { x: 186, y: 346 },
    landing: { x: 252, y: 342 },
    green: { x: 316, y: 316 },
    pin: { x: 314, y: 314 },
    badge: { x: 252, y: 368 },
    fairwayPath: "M 184 338 C 222 330 268 322 310 304 C 328 312 324 328 298 340 C 258 360 214 362 184 354 Z",
    greenPath: "M 316 316 m -20 0 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0",
    bunkers: [
      "M 234 352 C 246 346 254 356 246 366 C 234 366 228 358 234 352 Z",
    ],
    shotTrajectory: "M 186 346 Q 252 342 314 314",
    detail: {
      fairway: "M 140 290 C 260 280 400 270 540 265 C 680 260 780 270 870 285 C 860 345 740 360 600 365 C 440 370 280 360 140 340 Z",
      green: "M 870 285 m -34 0 a 34 26 0 1 0 68 0 a 34 26 0 1 0 -68 0",
      pin: { x: 875, y: 280 },
      landing1: { x: 520, y: 310, label: "IP1 (220m)" },
      bunkers: [
        { d: "M 480 230 C 510 220 525 235 515 250 C 495 255 475 245 480 230 Z", label: "좌측 벙커" }
      ],
      hazardWater: "M 530 365 C 660 350 780 360 810 410 C 760 450 630 460 520 430 C 500 395 510 375 530 365 Z",
      crossSection: "M 140 550 L 870 550",
    }
  },
  {
    number: 9,
    side: "out",
    par: 4,
    distance: 336,
    yards: 367,
    handicap: 13,
    name: "클럽하우스 어프로치",
    dogleg: "slight-right",
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
    fairwayPath: "M 328 284 C 362 262 398 244 430 232 C 440 244 428 258 398 278 C 366 296 344 306 328 300 Z",
    greenPath: "M 432 242 m -18 0 a 18 15 0 1 0 36 0 a 18 15 0 1 0 -36 0",
    bunkers: [
      "M 410 246 C 420 238 428 248 420 258 C 410 258 406 250 410 246 Z",
    ],
    shotTrajectory: "M 332 292 Q 386 262 430 240",
    detail: {
      fairway: "M 150 310 C 280 295 420 280 560 270 C 700 260 790 265 880 280 C 870 340 760 360 620 365 C 460 370 300 365 150 350 Z",
      green: "M 880 280 m -35 0 a 35 27 0 1 0 70 0 a 35 27 0 1 0 -70 0",
      pin: { x: 885, y: 275 },
      landing1: { x: 530, y: 310, label: "IP1 (225m)" },
      bunkers: [
        { d: "M 830 240 C 855 230 870 245 860 260 C 845 265 825 255 830 240 Z", label: "그린 앞 가드 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 150 560 L 880 520",
    }
  },
  {
    number: 10,
    side: "in",
    par: 4,
    distance: 376,
    yards: 411,
    handicap: 8,
    name: "이스트 스타트",
    dogleg: "straight",
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
    fairwayPath: "M 544 246 C 586 264 628 286 680 300 C 690 314 674 326 632 310 C 590 294 558 276 538 260 Z",
    greenPath: "M 682 306 m -20 0 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0",
    bunkers: [
      "M 630 294 C 642 288 650 298 642 308 C 630 310 624 302 630 294 Z",
    ],
    shotTrajectory: "M 546 256 Q 616 282 680 304",
    detail: {
      fairway: "M 140 290 C 260 280 400 270 540 265 C 680 260 780 270 870 285 C 860 345 740 360 600 365 C 440 370 280 360 140 340 Z",
      green: "M 870 285 m -34 0 a 34 26 0 1 0 68 0 a 34 26 0 1 0 -68 0",
      pin: { x: 875, y: 280 },
      landing1: { x: 520, y: 310, label: "IP1 (230m)" },
      bunkers: [
        { d: "M 550 340 C 580 330 595 345 585 360 C 565 365 545 355 550 340 Z", label: "우측 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 140 550 L 870 545",
    }
  },
  {
    number: 11,
    side: "in",
    par: 5,
    distance: 526,
    yards: 575,
    handicap: 2,
    name: "이스트 리지 롱홀",
    dogleg: "slight-left",
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
    fairwayPath: "M 698 312 C 752 334 810 356 852 324 C 884 296 892 262 902 228 C 914 234 902 278 866 326 C 824 372 760 370 698 334 Z",
    greenPath: "M 892 232 m -20 0 a 20 18 0 1 0 40 0 a 20 18 0 1 0 -40 0",
    bunkers: [
      "M 784 358 C 796 350 806 362 796 374 C 784 376 778 366 784 358 Z",
    ],
    shotTrajectory: "M 702 322 Q 776 346 846 306 T 890 230",
    detail: {
      fairway: "M 130 330 C 260 310 400 290 540 280 C 680 270 780 260 880 250 C 880 320 780 350 640 360 C 500 370 360 375 130 375 Z",
      green: "M 880 250 m -35 0 a 35 28 0 1 0 70 0 a 35 28 0 1 0 -70 0",
      pin: { x: 885, y: 245 },
      landing1: { x: 440, y: 320, label: "IP1 (235m)" },
      landing2: { x: 710, y: 300, label: "IP2 (215m)" },
      bunkers: [
        { d: "M 420 240 C 450 230 465 245 455 260 C 435 265 415 255 420 240 Z", label: "좌측 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 130 580 L 880 510",
    }
  },
  {
    number: 12,
    side: "in",
    par: 3,
    distance: 172,
    yards: 188,
    handicap: 16,
    name: "이스트 밸리 레이크",
    dogleg: "straight",
    elevation: "계곡 내리막 -6m",
    hazards: ["이스트 레이크 연못 해저드", "그린 앞 샌드 트랩"],
    tip: "계곡과 호수를 넘겨야 하는 아름다운 시그니처 파 3입니다. 계곡풍이 핀을 향해 불어오므로 넉넉한 번호 선택이 안전합니다.",
    recommendClub: "5I (165m 맞바람 대비)",
    landingWidth: "그린 직경 26m",
    fairwayAccuracy: "72%",
    teeBox: { x: 896, y: 206 },
    landing: { x: 884, y: 160 },
    green: { x: 876, y: 122 },
    pin: { x: 874, y: 120 },
    badge: { x: 928, y: 162 },
    fairwayPath: "M 902 208 C 892 174 888 152 880 122 C 868 112 862 122 868 152 C 876 184 888 202 898 218 Z",
    greenPath: "M 876 122 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0",
    bunkers: [
      "M 864 130 C 876 124 884 136 876 146 C 864 146 860 136 864 130 Z",
    ],
    shotTrajectory: "M 896 206 Q 884 160 874 120",
    detail: {
      fairway: "M 150 280 C 260 270 340 270 420 280 C 410 340 330 350 240 340 C 180 330 150 320 150 280 Z",
      green: "M 830 300 m -36 0 a 36 28 0 1 0 72 0 a 36 28 0 1 0 -72 0",
      pin: { x: 835, y: 295 },
      landing1: { x: 830, y: 300, label: "PIN (172m)" },
      bunkers: [
        { d: "M 780 260 C 810 250 825 265 815 280 C 795 285 775 275 780 260 Z", label: "앞 샌드 트랩" }
      ],
      hazardWater: "M 390 220 C 580 190 760 210 800 290 C 780 380 600 410 420 380 C 370 320 360 260 390 220 Z",
      crossSection: "M 150 510 L 830 570",
    }
  },
  {
    number: 13,
    side: "in",
    par: 4,
    distance: 408,
    yards: 446,
    handicap: 4,
    name: "하이랜드 리지",
    dogleg: "straight",
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
    fairwayPath: "M 854 88 C 806 74 764 62 712 62 C 682 62 678 74 690 86 C 734 92 780 98 840 110 Z",
    greenPath: "M 692 72 m -20 0 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0",
    bunkers: [
      "M 780 58 C 792 50 800 62 792 72 C 780 72 774 64 780 58 Z",
    ],
    shotTrajectory: "M 852 96 Q 772 76 690 70",
    detail: {
      fairway: "M 140 290 C 280 280 420 270 560 265 C 700 260 790 270 880 285 C 870 345 760 360 620 365 C 460 370 300 360 140 340 Z",
      green: "M 880 285 m -34 0 a 34 26 0 1 0 68 0 a 34 26 0 1 0 -68 0",
      pin: { x: 885, y: 280 },
      landing1: { x: 520, y: 310, label: "IP1 (235m)" },
      bunkers: [
        { d: "M 500 230 C 530 220 545 235 535 250 C 515 255 495 245 500 230 Z", label: "좌측 크로스 벙커" },
        { d: "M 530 350 C 560 340 575 355 565 370 C 545 375 525 365 530 350 Z", label: "우측 페어웨이 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 140 550 L 880 535",
    }
  },
  {
    number: 14,
    side: "in",
    par: 4,
    distance: 348,
    yards: 381,
    handicap: 12,
    name: "도그레그 코너",
    dogleg: "slight-right",
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
    fairwayPath: "M 674 60 C 634 74 602 102 570 138 C 556 158 568 168 584 150 C 618 124 650 96 684 72 Z",
    greenPath: "M 566 146 m -18 0 a 18 16 0 1 0 36 0 a 18 16 0 1 0 -36 0",
    bunkers: [
      "M 620 82 C 632 74 640 86 632 94 C 620 96 614 88 620 82 Z",
    ],
    shotTrajectory: "M 672 66 Q 612 96 564 144",
    detail: {
      fairway: "M 140 310 C 260 295 400 280 540 260 C 680 240 780 245 870 270 C 860 330 740 350 580 360 C 420 370 280 360 140 350 Z",
      green: "M 870 270 m -34 0 a 34 26 0 1 0 68 0 a 34 26 0 1 0 -68 0",
      pin: { x: 875, y: 265 },
      landing1: { x: 510, y: 310, label: "IP1 (200m)" },
      bunkers: [
        { d: "M 540 230 C 570 220 585 235 575 250 C 555 255 535 245 540 230 Z", label: "코너 도그레그 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 140 540 L 870 570",
    }
  },
  {
    number: 15,
    side: "in",
    par: 3,
    distance: 151,
    yards: 165,
    handicap: 18,
    name: "트리플 벙커 핀",
    dogleg: "straight",
    elevation: "내리막 -2m",
    hazards: ["그린 3면을 감싼 샌드 벙커"],
    tip: "그린이 3개의 벙커로 철저하게 보호받고 있습니다. 그린 앞뒤 단차가 커서 핀보다 살짝 짧게 올리는 것이 안전한 2퍼트 공략입니다.",
    recommendClub: "9I (138m 벙커 캐리)",
    landingWidth: "그린 직경 25m",
    fairwayAccuracy: "75%",
    teeBox: { x: 586, y: 166 },
    landing: { x: 610, y: 188 },
    green: { x: 636, y: 212 },
    pin: { x: 634, y: 210 },
    badge: { x: 582, y: 202 },
    fairwayPath: "M 588 160 C 610 176 626 194 640 210 C 652 226 640 232 624 220 C 602 204 584 186 580 172 Z",
    greenPath: "M 636 212 m -18 0 a 18 18 0 1 0 36 0 a 18 18 0 1 0 -36 0",
    bunkers: [
      "M 644 196 C 656 188 664 200 656 210 C 644 210 640 200 644 196 Z",
      "M 620 220 C 630 214 638 224 630 232 C 620 232 616 224 620 220 Z",
    ],
    shotTrajectory: "M 586 166 Q 610 188 634 210",
    detail: {
      fairway: "M 160 290 C 260 280 340 280 420 290 C 410 340 330 350 250 340 C 190 335 160 325 160 290 Z",
      green: "M 810 300 m -35 0 a 35 28 0 1 0 70 0 a 35 28 0 1 0 -70 0",
      pin: { x: 815, y: 295 },
      landing1: { x: 810, y: 300, label: "PIN (151m)" },
      bunkers: [
        { d: "M 760 240 C 785 230 800 245 790 260 C 775 265 755 255 760 240 Z", label: "그린 좌측 벙커" },
        { d: "M 780 340 C 810 330 825 345 815 360 C 795 365 775 355 780 340 Z", label: "그린 우측 벙커" }
      ],
      hazardWater: null,
      crossSection: "M 160 540 L 810 560",
    }
  },
  {
    number: 16,
    side: "in",
    par: 5,
    distance: 505,
    yards: 552,
    handicap: 6,
    name: "레이크 밸리 롱홀",
    dogleg: "slight-right",
    elevation: "내리막 -7m",
    hazards: ["우측 센트럴 레이크 수역", "세컨드 낙하지점 벙커"],
    tip: "오른편 호수를 감싸며 남쪽으로 시원하게 내려오는 파 5입니다. 우측 해저드를 경계하며 페어웨이 좌측 능선을 적극 활용하세요.",
    recommendClub: "1W (230m) → 4U (195m) → 52° (80m)",
    landingWidth: "37m (워터 해저드 경계)",
    fairwayAccuracy: "66%",
    teeBox: { x: 706, y: 216 },
    landing: { x: 772, y: 252 },
    landing2: { x: 746, y: 346 },
    green: { x: 702, y: 436 },
    pin: { x: 700, y: 434 },
    badge: { x: 786, y: 292 },
    fairwayPath: "M 708 210 C 756 230 792 266 776 324 C 760 370 734 406 702 440 C 718 448 750 408 776 362 C 802 304 790 242 718 214 Z",
    greenPath: "M 702 436 m -20 0 a 20 18 0 1 0 40 0 a 20 18 0 1 0 -40 0",
    bunkers: [
      "M 750 354 C 762 346 772 358 762 368 C 750 368 744 358 750 354 Z",
    ],
    shotTrajectory: "M 706 216 Q 772 252 746 346 T 700 434",
    detail: {
      fairway: "M 130 320 C 260 290 400 270 540 275 C 680 280 780 260 880 240 C 890 300 780 340 640 345 C 500 350 360 365 130 365 Z",
      green: "M 880 240 m -32 0 a 32 25 0 1 0 64 0 a 32 25 0 1 0 -64 0",
      pin: { x: 885, y: 236 },
      landing1: { x: 440, y: 310, label: "IP1 (230m)" },
      landing2: { x: 710, y: 295, label: "IP2 (195m)" },
      bunkers: [
        { d: "M 690 240 C 715 230 730 245 720 260 C 705 265 685 255 690 240 Z", label: "세컨드 벙커" }
      ],
      hazardWater: "M 480 360 C 600 350 720 365 770 410 C 730 450 600 460 480 430 C 460 395 470 375 480 360 Z",
      crossSection: "M 130 520 L 880 590",
    }
  },
  {
    number: 17,
    side: "in",
    par: 4,
    distance: 391,
    yards: 428,
    handicap: 10,
    name: "워터 사이드 웨이",
    dogleg: "straight",
    elevation: "평지 +0m",
    hazards: ["남측 거대 호수 해저드", "그린 앞 세컨드 벙커"],
    tip: "남쪽 호수 수면을 따라 서쪽으로 진행하는 까다로운 미들홀입니다. 슬라이스 바람이 자주 불므로 타겟을 좌측 페어웨이로 잡으세요.",
    recommendClub: "1W (225m) → 7I (150m)",
    landingWidth: "38m (호수 바람)",
    fairwayAccuracy: "73%",
    teeBox: { x: 676, y: 456 },
    landing: { x: 606, y: 472 },
    green: { x: 532, y: 456 },
    pin: { x: 530, y: 454 },
    badge: { x: 606, y: 496 },
    fairwayPath: "M 678 448 C 642 460 594 464 542 452 C 522 448 530 462 556 478 C 604 490 650 484 686 464 Z",
    greenPath: "M 532 456 m -20 0 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0",
    bunkers: [
      "M 590 454 C 602 446 610 456 602 466 C 590 466 584 458 590 454 Z",
    ],
    shotTrajectory: "M 676 456 Q 606 472 530 454",
    detail: {
      fairway: "M 140 290 C 260 280 400 270 540 265 C 680 260 780 270 870 285 C 860 345 740 360 600 365 C 440 370 280 360 140 340 Z",
      green: "M 870 285 m -34 0 a 34 26 0 1 0 68 0 a 34 26 0 1 0 -68 0",
      pin: { x: 875, y: 280 },
      landing1: { x: 520, y: 310, label: "IP1 (225m)" },
      bunkers: [
        { d: "M 820 250 C 850 240 865 255 855 270 C 835 275 815 265 820 250 Z", label: "그린 앞 벙커" }
      ],
      hazardWater: "M 140 360 C 350 350 600 360 780 380 C 760 450 500 470 250 450 C 150 420 130 385 140 360 Z",
      crossSection: "M 140 550 L 870 550",
    }
  },
  {
    number: 18,
    side: "in",
    par: 4,
    distance: 362,
    yards: 396,
    handicap: 14,
    name: "클럽하우스 피날레",
    dogleg: "straight",
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
    fairwayPath: "M 514 446 C 496 402 484 362 474 298 C 462 288 484 288 496 348 C 508 390 518 426 524 446 Z",
    greenPath: "M 476 296 m -20 0 a 20 16 0 1 0 40 0 a 20 16 0 1 0 -40 0",
    bunkers: [
      "M 494 364 C 506 356 514 368 506 378 C 494 378 488 370 494 364 Z",
      "M 458 294 C 468 286 476 296 468 306 C 458 306 454 298 458 294 Z",
    ],
    shotTrajectory: "M 506 446 Q 486 376 474 294",
    detail: {
      fairway: "M 150 310 C 280 295 420 280 560 270 C 700 260 790 265 880 280 C 870 340 760 360 620 365 C 460 370 300 365 150 350 Z",
      green: "M 880 280 m -35 0 a 35 27 0 1 0 70 0 a 35 27 0 1 0 -70 0",
      pin: { x: 885, y: 275 },
      landing1: { x: 530, y: 310, label: "IP1 (220m)" },
      bunkers: [
        { d: "M 830 240 C 855 230 870 245 860 260 C 845 265 825 255 830 240 Z", label: "그린 좌측 벙커" },
        { d: "M 840 330 C 870 320 885 335 875 350 C 855 355 835 345 840 330 Z", label: "그린 우측 벙커" }
      ],
      hazardWater: "M 150 360 C 280 345 420 350 490 390 C 460 450 300 460 170 430 C 130 395 140 375 150 360 Z",
      crossSection: "M 150 560 L 880 520",
    }
  },
];

export default function CourseMap({ courseName = "그린힐스 파크 컨트리클럽" }) {
  // viewMode: "detail" (혁신적인 홀 집중 정밀 야디지 뷰 - 기본값), "masterplan" (18홀 전체 코스 평면도)
  const [viewMode, setViewMode] = useState("detail");
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

  function handlePrevHole() {
    setSelectedHoleNumber((prev) => (prev > 1 ? prev - 1 : 18));
  }

  function handleNextHole() {
    setSelectedHoleNumber((prev) => (prev < 18 ? prev + 1 : 1));
  }

  const isDetail = viewMode === "detail";

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      aria-labelledby="course-map-heading"
    >
      {/* 카드 쉘 */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#090e15] text-slate-100 shadow-2xl">
        {/* 상단 통합 컨트롤 헤더 */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 bg-[#0c141f] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-cyan-400">
                PRECISION ARCHITECTURAL VECTOR
              </span>
              <span className="font-mono text-xs text-slate-400">· 18H / PAR 72 · CAD YARDAGE</span>
            </div>
            <h2
              id="course-map-heading"
              className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl"
            >
              2D 인터랙티브 코스맵
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              {isDetail
                ? "선택 홀의 비거리 부채꼴 아크, 티샷 랜딩존, 벙커 캐리, 그린 등고선 격자를 정밀하게 시각화합니다."
                : "골프장 전체 18홀 건축 평면도(CAD Masterplan)입니다. 홀을 선택해 동선을 파악하세요."}
            </p>
          </div>

          {/* 우측 뷰 모드 스위처 & 코스 필터 */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 뷰 모드 토글 (홀 상세 vs 18홀 마스터플랜) */}
            <div
              className="flex items-center rounded-xl border border-slate-800 bg-[#111c2a] p-1 text-xs font-semibold"
              role="group"
              aria-label="코스맵 뷰 모드 선택"
            >
              <button
                type="button"
                onClick={() => setViewMode("detail")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                  isDetail
                    ? "bg-cyan-500 font-bold text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-pressed={isDetail}
              >
                <span>🎯 홀 정밀 야디지</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("masterplan")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                  !isDetail
                    ? "bg-cyan-500 font-bold text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
                aria-pressed={!isDetail}
              >
                <span>📐 18홀 전체 도면</span>
              </button>
            </div>

            {/* 코스 구간 필터 */}
            <div
              role="radiogroup"
              aria-label="코스 구간 필터"
              className="flex items-center rounded-xl border border-slate-800 bg-[#111c2a] p-1 text-xs font-semibold"
            >
              {[
                { id: "all", label: "전체" },
                { id: "out", label: "OUT" },
                { id: "in", label: "IN" },
              ].map(({ id, label }) => {
                const active = courseSide === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSideChange(id)}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      active
                        ? "bg-slate-700 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* 메인 뷰: 데스크톱 지도 70% + 우측 야디지북 30% / 모바일 상하 배치 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px]">
          {/* 좌측: 인터랙티브 벡터 그래픽 캔버스 */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-[#070b10] p-2 sm:p-4">
            {/* 상단 오버레이 HUD 정보 바 */}
            <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-400 backdrop-blur-md">
                {courseName}
              </span>
              <span className="rounded-md border border-cyan-500/20 bg-cyan-950/40 px-2 py-1 font-mono text-[10px] text-cyan-300 backdrop-blur-md">
                {isDetail
                  ? `HOLE ${selectedHole.number} · PAR ${selectedHole.par} · ${selectedHole.distance}M`
                  : "CAD ARCHITECTURAL MASTERPLAN (1:2500)"}
              </span>
            </div>

            {/* 홀 상세 뷰일 때: 이전 홀 / 다음 홀 퀵 컨트롤 */}
            {isDetail && (
              <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevHole}
                  aria-label="이전 홀"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 text-xs font-bold text-slate-200 backdrop-blur-md transition hover:border-cyan-500 hover:text-cyan-400"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={handleNextHole}
                  aria-label="다음 홀"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 text-xs font-bold text-slate-200 backdrop-blur-md transition hover:border-cyan-500 hover:text-cyan-400"
                >
                  ▶
                </button>
              </div>
            )}

            {/* 스크롤 가능한 SVG 컨테이너 */}
            <div className="relative w-full overflow-x-auto pb-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500">
              <div className="min-w-[700px] select-none lg:min-w-0">
                <svg
                  viewBox="0 0 1000 620"
                  className="h-auto w-full"
                  role="img"
                  aria-label={`${courseName} ${isDetail ? `${selectedHole.number}번 홀 야디지` : "18홀 마스터플랜"}`}
                >
                  <defs>
                    {/* CAD 그리드 텍스처 */}
                    <pattern id="cadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="40" y2="0" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                      <line x1="0" y1="0" x2="0" y2="40" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
                    </pattern>

                    {/* 페어웨이 에메랄드 그라데이션 */}
                    <linearGradient id="vectorFairway" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#064e3b" />
                      <stop offset="50%" stopColor="#047857" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>

                    <linearGradient id="vectorFairwayActive" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>

                    {/* 워터 해저드 그라데이션 */}
                    <linearGradient id="vectorWater" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0369a1" />
                      <stop offset="70%" stopColor="#075985" />
                      <stop offset="100%" stopColor="#0c4a6e" />
                    </linearGradient>

                    {/* 벙커 샌드 그라데이션 */}
                    <linearGradient id="vectorBunker" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef3c7" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>

                    {/* 네온 글로우 필터 */}
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur" />
                      <feFlood floodColor="#22d3ee" floodOpacity="0.9" result="color" />
                      <feComposite in2="blur" operator="in" result="shadow" />
                      <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* 1. 배경 베이스 및 정밀 CAD 제도 그리드 */}
                  <rect width="1000" height="620" rx="14" fill="#080e14" />
                  <rect width="1000" height="620" rx="14" fill="url(#cadGrid)" />

                  {/* 도면 외곽 테두리 및 코너 크로스헤어 */}
                  <rect x="15" y="15" width="970" height="590" rx="8" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <path d="M 25 35 L 25 25 L 35 25 M 975 25 L 965 25 L 975 35 M 25 585 L 25 595 L 35 595 M 975 585 L 975 595 L 965 595" fill="none" stroke="#38bdf8" strokeWidth="1.5" />

                  {/* ======================================================== */}
                  {/* VIEW 1: [홀 정밀 야디지 (Hole Detail)] — 웅장하고 혁신적인 뷰 */}
                  {/* ======================================================== */}
                  {isDetail && (
                    <g id="single-hole-detail">
                      {/* (1) 티박스 기준 부채꼴 비거리 아크 링 (Fan Distance Arcs) */}
                      <g id="distance-arcs" opacity="0.85">
                        {[
                          { r: 240, dist: "100m", yd: "109yd" },
                          { r: 380, dist: "150m", yd: "164yd" },
                          { r: 520, dist: "200m", yd: "219yd" },
                          { r: 660, dist: "250m", yd: "273yd" },
                        ].map((arc, aIdx) => (
                          <g key={aIdx}>
                            <path
                              d={`M ${150 + arc.r * Math.cos(-0.45)} ${310 + arc.r * Math.sin(-0.45)} A ${arc.r} ${arc.r} 0 0 1 ${150 + arc.r * Math.cos(0.45)} ${310 + arc.r * Math.sin(0.45)}`}
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="1"
                              strokeDasharray="4 6"
                              opacity="0.45"
                            />
                            {/* 아크 거리 뱃지 */}
                            <rect
                              x={150 + arc.r * Math.cos(0.35) - 34}
                              y={310 + arc.r * Math.sin(0.35) - 8}
                              width="68"
                              height="16"
                              rx="4"
                              fill="#082f49"
                              stroke="#0284c7"
                              strokeWidth="1"
                            />
                            <text
                              x={150 + arc.r * Math.cos(0.35)}
                              y={310 + arc.r * Math.sin(0.35) + 3}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="700"
                              fontFamily="monospace"
                              fill="#38bdf8"
                            >
                              {arc.dist} ({arc.yd})
                            </text>
                          </g>
                        ))}
                      </g>

                      {/* (2) 홀 전용 워터 해저드 (있을 경우) */}
                      {selectedHole.detail.hazardWater && (
                        <g id="detail-water">
                          <path
                            d={selectedHole.detail.hazardWater}
                            fill="url(#vectorWater)"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeOpacity="0.7"
                          />
                          {/* 수면 물결 해칭 라인 */}
                          <path
                            d="M 450 280 Q 550 250 650 290 M 470 320 Q 570 290 670 330"
                            fill="none"
                            stroke="#7dd3fc"
                            strokeWidth="1.5"
                            strokeOpacity="0.4"
                            strokeDasharray="6 8"
                          />
                        </g>
                      )}

                      {/* (3) 당당하고 넓은 페어웨이 폴리곤 */}
                      <path
                        d={selectedHole.detail.fairway}
                        fill="url(#vectorFairwayActive)"
                        stroke="#34d399"
                        strokeWidth="2.5"
                        filter="url(#neonGlow)"
                      />

                      {/* 페어웨이 중앙 런웨이 대시 가이드라인 */}
                      <line x1="150" y1="310" x2="880" y2="280" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="8 8" strokeOpacity="0.35" />

                      {/* (4) 홀 전용 샌드 벙커들 */}
                      {selectedHole.detail.bunkers.map((b, bIdx) => (
                        <g key={bIdx}>
                          <path d={b.d} fill="url(#vectorBunker)" stroke="#f59e0b" strokeWidth="1.5" />
                          <text
                            x={b.d.includes("M 5") ? 550 : 850}
                            y={b.d.includes("M 5") ? 215 : 230}
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                            fill="#fbbf24"
                          >
                            ⚠️ {b.label}
                          </text>
                        </g>
                      ))}

                      {/* (5) 그린 & 퍼팅 등고선 격자 (Putting Contour Grid) */}
                      <g id="detail-green">
                        <path
                          d={selectedHole.detail.green}
                          fill="#10b981"
                          stroke="#6ee7b7"
                          strokeWidth="2.5"
                        />
                        {/* 퍼팅 등고 격자선 */}
                        <ellipse cx={selectedHole.detail.pin.x} cy={selectedHole.detail.pin.y} rx="26" ry="18" fill="none" stroke="#a7f3d0" strokeWidth="0.8" strokeDasharray="2 3" strokeOpacity="0.8" />
                        <ellipse cx={selectedHole.detail.pin.x} cy={selectedHole.detail.pin.y} rx="14" ry="9" fill="none" stroke="#a7f3d0" strokeWidth="0.8" strokeDasharray="2 3" strokeOpacity="0.8" />
                        
                        {/* 핀 플래그 & 타겟 크로스헤어 */}
                        <g transform={`translate(${selectedHole.detail.pin.x}, ${selectedHole.detail.pin.y})`}>
                          <circle r="3" fill="#ef4444" />
                          <line x1="0" y1="0" x2="0" y2="-22" stroke="#ffffff" strokeWidth="2" />
                          <polygon points="0,-22 14,-17 0,-12" fill="#ef4444" />
                          <circle r="16" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" />
                          <text x="0" y="22" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f87171" fontFamily="monospace">
                            PIN CUP
                          </text>
                        </g>
                      </g>

                      {/* (6) 티잉 그라운드 (Tee Ground) */}
                      <g transform="translate(140, 310)">
                        <rect x="-16" y="-12" width="32" height="24" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                        <circle cx="-7" cy="0" r="3" fill="#ffffff" />
                        <circle cx="7" cy="0" r="3" fill="#38bdf8" />
                        <text x="0" y="24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">
                          TEE
                        </text>
                      </g>

                      {/* (7) 1차 랜딩 타겟 (IP1) & 텔레메트리 크로스헤어 */}
                      <g transform={`translate(${selectedHole.detail.landing1.x}, ${selectedHole.detail.landing1.y})`}>
                        <circle r="24" fill="#38bdf8" fillOpacity="0.08" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
                        <circle r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                        <circle r="3" fill="#38bdf8" />
                        <line x1="-30" y1="0" x2="30" y2="0" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" />
                        <line x1="0" y1="-30" x2="0" y2="30" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" />
                        <rect x="-45" y="-45" width="90" height="18" rx="4" fill="#0284c7" />
                        <text x="0" y="-33" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffffff" fontFamily="monospace">
                          🎯 {selectedHole.detail.landing1.label}
                        </text>
                      </g>

                      {/* (8) 하단 지형 고저차 단면 프로필 (Elevation Cross-Section) */}
                      <g id="elevation-profile" transform="translate(0, 0)">
                        <rect x="140" y="515" width="760" height="70" rx="6" fill="#0f172a" fillOpacity="0.7" stroke="#334155" strokeWidth="1" />
                        <text x="155" y="534" fontSize="9" fontWeight="bold" fill="#94a3b8" fontFamily="monospace">
                          ELEVATION PROFILE (고저차 단면): {selectedHole.elevation}
                        </text>
                        <path d={selectedHole.detail.crossSection} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
                        <circle cx="150" cy="550" r="4" fill="#22d3ee" />
                        <circle cx="880" cy="550" r="4" fill="#ef4444" />
                        <text x="150" y="575" fontSize="8" fill="#94a3b8" fontFamily="monospace">TEE 0m</text>
                        <text x="880" y="575" fontSize="8" fill="#94a3b8" fontFamily="monospace">GREEN {selectedHole.distance}m</text>
                      </g>
                    </g>
                  )}

                  {/* ======================================================== */}
                  {/* VIEW 2: [18홀 전체 코스 평면도 (Masterplan)] */}
                  {/* ======================================================== */}
                  {!isDetail && (
                    <g id="full-course-masterplan">
                      {/* (1) 코스 부지 외곽 대지 폴리곤 (Site Boundary) */}
                      <path
                        d="M 60 70 C 200 40 400 30 600 40 C 800 30 940 70 940 250 C 950 420 880 550 700 560 C 500 570 300 560 100 520 C 40 400 40 200 60 70 Z"
                        fill="#0b1722"
                        stroke="#1e3a52"
                        strokeWidth="1.5"
                      />

                      {/* (2) 코스 등고선 레이어 8가닥 */}
                      <g opacity="0.35" stroke="#0ea5e9" strokeWidth="0.8" fill="none">
                        <path d="M 80 120 Q 300 90 550 110 T 920 140" strokeDasharray="3 5" />
                        <path d="M 70 240 Q 350 210 650 230 T 930 280" />
                        <path d="M 80 380 Q 400 360 680 390 T 910 440" strokeDasharray="4 6" />
                        <path d="M 120 480 Q 450 460 750 490 T 880 500" />
                      </g>

                      {/* (3) 수계 (Lakes & Streams) */}
                      <g id="masterplan-water">
                        {/* 센트럴 레이크 */}
                        <path
                          d="M 400 340 C 450 310 520 325 570 355 C 600 395 565 440 500 435 C 445 430 385 390 400 340 Z"
                          fill="url(#vectorWater)"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        {/* 웨스트 레이크 */}
                        <path
                          d="M 135 395 C 185 375 235 405 225 455 C 205 490 145 495 115 455 C 100 420 115 398 135 395 Z"
                          fill="url(#vectorWater)"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                        {/* 이스트 밸리 레이크 */}
                        <path
                          d="M 790 190 C 850 165 915 185 895 240 C 875 285 815 270 775 235 C 765 205 775 195 790 190 Z"
                          fill="url(#vectorWater)"
                          stroke="#38bdf8"
                          strokeWidth="2"
                        />
                      </g>

                      {/* (4) 카트 도로망 (Cart Paths) */}
                      <g opacity="0.5">
                        <path
                          d="M 445 285 C 380 300 320 350 250 410 C 190 435 125 435 95 380 C 70 300 80 200 115 115 C 160 85 240 60 310 65 C 360 80 415 95 435 130"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 525 285 C 590 305 670 325 730 350 C 800 365 870 340 890 280 C 910 210 890 140 840 85 C 770 55 690 55 620 85 C 575 115 540 160 525 210"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </g>

                      {/* (5) 클럽하우스 건축 평면 */}
                      <g id="masterplan-clubhouse" transform="translate(450, 235)">
                        <rect x="0" y="0" width="70" height="42" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                        <rect x="8" y="8" width="54" height="26" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                        <text x="35" y="24" textAnchor="middle" fontSize="8" fontWeight="800" fill="#38bdf8" fontFamily="monospace">
                          CLUB HOUSE
                        </text>
                      </g>

                      {/* (6) 18개 홀 페어웨이, 벙커, 그린, 뱃지 */}
                      <g id="masterplan-holes">
                        {HOLES.map((hole) => {
                          const isSelected = hole.number === selectedHoleNumber;
                          const isHovered = hole.number === hoveredHoleNumber;
                          const isVisible = visibleHoles.some((h) => h.number === hole.number);

                          const opacity = isVisible
                            ? isSelected
                              ? 1
                              : isHovered
                              ? 0.8
                              : 0.45
                            : 0.12;

                          return (
                            <g
                              key={hole.number}
                              opacity={opacity}
                              className="transition-all duration-300"
                              onClick={() => setSelectedHoleNumber(hole.number)}
                              onMouseEnter={() => setHoveredHoleNumber(hole.number)}
                              onMouseLeave={() => setHoveredHoleNumber(null)}
                            >
                              {/* 페어웨이 면 */}
                              <path
                                d={hole.fairwayPath}
                                fill={isSelected ? "url(#vectorFairwayActive)" : "url(#vectorFairway)"}
                                stroke={isSelected ? "#fbbf24" : isHovered ? "#22d3ee" : "#0d9488"}
                                strokeWidth={isSelected ? 3 : 1.5}
                                filter={isSelected ? "url(#neonGlow)" : undefined}
                                className="cursor-pointer"
                              />

                              {/* 벙커 */}
                              {hole.bunkers.map((bp, bIdx) => (
                                <path key={bIdx} d={bp} fill="url(#vectorBunker)" stroke="#d97706" strokeWidth="1" />
                              ))}

                              {/* 그린 */}
                              <path d={hole.greenPath} fill="#10b981" stroke="#34d399" strokeWidth="1.5" />

                              {/* 선택 홀: 정밀 치수 샷 궤적선 */}
                              {isSelected && (
                                <g pointerEvents="none">
                                  <path
                                    d={hole.shotTrajectory}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="3"
                                    strokeDasharray="6 4"
                                  />
                                  <circle cx={hole.landing.x} cy={hole.landing.y} r="8" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                                  <circle cx={hole.landing.x} cy={hole.landing.y} r="3" fill="#38bdf8" />
                                </g>
                              )}

                              {/* 홀 번호 뱃지 */}
                              <g
                                transform={`translate(${hole.badge.x}, ${hole.badge.y})`}
                                tabIndex={0}
                                role="button"
                                aria-label={`${hole.number}번 홀`}
                                className="cursor-pointer"
                              >
                                <circle
                                  r={isSelected ? 14 : 11}
                                  fill={isSelected ? "#0284c7" : isHovered ? "#0f766e" : "#0f172a"}
                                  stroke={isSelected ? "#38bdf8" : isHovered ? "#2dd4bf" : "#334155"}
                                  strokeWidth={isSelected ? 2.5 : 1}
                                />
                                <text
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize={isSelected ? "11" : "9"}
                                  fontWeight="800"
                                  fill="#ffffff"
                                  fontFamily="monospace"
                                >
                                  {hole.number}
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </g>

                      {/* 도면 제도 스케일 바 및 나침반 */}
                      <g id="drawing-tools" transform="translate(40, 530)" opacity="0.8">
                        {/* 스케일 바 */}
                        <rect x="0" y="20" width="120" height="4" fill="#334155" />
                        <rect x="0" y="20" width="60" height="4" fill="#38bdf8" />
                        <text x="0" y="14" fontSize="8" fill="#94a3b8" fontFamily="monospace">0m</text>
                        <text x="60" y="14" fontSize="8" fill="#94a3b8" fontFamily="monospace">100m</text>
                        <text x="120" y="14" fontSize="8" fill="#94a3b8" fontFamily="monospace">200m</text>
                        {/* 나침반 */}
                        <circle cx="170" cy="20" r="14" fill="none" stroke="#334155" strokeWidth="1" />
                        <polygon points="170,8 174,20 170,17 166,20" fill="#38bdf8" />
                        <polygon points="170,32 174,20 170,23 166,20" fill="#64748b" />
                        <text x="170" y="4" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#38bdf8" fontFamily="monospace">N</text>
                      </g>
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* 하단 범례 & 실시간 안내 */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0c141f] px-3.5 py-2.5 text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-4 rounded-sm bg-[#10b981]" /> 페어웨이
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-full bg-[#34d399]" /> 퍼팅 그린
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-3.5 rounded-sm bg-[#0284c7]" /> 워터 해저드
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-full bg-[#f59e0b]" /> 샌드 벙커
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 border-t-2 border-dashed border-[#38bdf8]" /> 정밀 공략선
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                💡 상단 탭에서 [🎯 홀 정밀 야디지]와 [📐 18홀 전체 도면]을 자유롭게 전환할 수 있습니다.
              </span>
            </div>
          </div>

          {/* 우측: 정돈된 스마트 야디지북 정보 패널 */}
          <aside
            className="flex flex-col justify-between border-t border-slate-800 bg-[#0c141f] p-5 lg:border-l lg:border-t-0 sm:p-6"
            aria-live="polite"
          >
            <div>
              {/* 홀 번호 및 PAR 헤더 */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                      YARDAGE SPEC
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-400">
                      {selectedHole.side.toUpperCase()} COURSE
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-5xl font-black tracking-tight text-white">
                    {selectedHole.number}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="rounded-full bg-cyan-500 px-3.5 py-1 font-mono text-sm font-black text-slate-950 shadow-md">
                    PAR {selectedHole.par}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400">
                    HCP {selectedHole.handicap}
                  </span>
                </div>
              </div>

              {/* 홀 명칭 */}
              <h3 className="mt-3 text-base font-bold text-white">
                {selectedHole.name}
              </h3>

              {/* 비거리 및 스펙 지표 */}
              <dl className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-xs text-slate-400">전장 거리</dt>
                  <dd className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-xl font-bold tracking-tight text-white">
                      {selectedHole.distance}m
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      ({selectedHole.yards}yd)
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                  <dt className="text-xs text-slate-400">고저차 / 지형</dt>
                  <dd className="mt-1 text-sm font-semibold text-cyan-400">
                    {selectedHole.elevation}
                  </dd>
                </div>
              </dl>

              {/* 스마트 텔레메트리 추천 박스 */}
              <div className="mt-3.5 space-y-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">🏌️ 권장 클럽 플랜</span>
                  <span className="font-bold text-cyan-400">
                    {selectedHole.recommendClub}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">🎯 랜딩존 폭 / 안착률</span>
                  <span className="font-bold text-white">
                    {selectedHole.landingWidth} ({selectedHole.fairwayAccuracy})
                  </span>
                </div>
              </div>

              {/* 주의 위험 요소 (Hazards) */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400">주요 위험 요소</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {selectedHole.hazards.map((hazard, hIdx) => (
                    <span
                      key={hIdx}
                      className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400"
                    >
                      ⚠️ {hazard}
                    </span>
                  ))}
                </div>
              </div>

              {/* 공략 가이드 */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/40 p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                  <span>⛳ 캐디 전술 브리핑</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {selectedHole.tip}
                </p>
              </div>
            </div>

            {/* 18홀 빠른 선택 매트릭스 */}
            <div className="mt-6 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>홀 바로가기</span>
                <span className="font-mono text-cyan-400">{selectedHole.number}번 홀 선택됨</span>
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
                      className={`relative flex aspect-square items-center justify-center rounded-lg font-mono text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-cyan-500 text-slate-950 shadow-md ring-2 ring-cyan-400"
                          : isInSide
                          ? "border border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700 hover:bg-slate-800"
                          : "border border-slate-800/40 bg-slate-950 text-slate-600 hover:bg-slate-900"
                      }`}
                    >
                      {hole.number}
                    </button>
                  );
                })}
              </div>

              {/* 안내 각주 */}
              <p className="mt-3 text-center text-[11px] text-slate-500">
                ※ 본 코스맵은 인터랙티브 코스 가이드 시연용 샘플입니다.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
