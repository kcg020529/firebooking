"use client";

import { useMemo, useState } from "react";

// ============================================================================
// 18홀 정밀 챔피언십 코스 데이터 (실제 골프장 항공 야디지북 규격)
// ============================================================================
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
    hazards: ["우측 페어웨이 벙커 (210m)", "좌측 가드 벙커"],
    tip: "클럽하우스에서 출발하는 첫 홀입니다. 오른쪽 벙커 좌측으로 부드럽게 티샷을 보내면 세컨드 샷 시야가 깨끗하게 열립니다.",
    recommendClub: "드라이버 230m → 8번 아이언 145m",
    landingWidth: "페어웨이 폭 45m (여유)",
    // 18홀 마스터플랜 좌표 (1100 x 700 캔버스)
    master: {
      tee: { x: 505, y: 555 },
      landing: { x: 440, y: 520 },
      green: { x: 375, y: 490 },
      pin: { x: 375, y: 486 },
      label: { x: 435, y: 505 },
      fairway: "M 500 550 C 470 535 450 525 435 515 C 410 500 390 495 370 485 C 375 500 405 515 435 532 C 465 545 490 560 510 562 Z",
      greenShape: "M 375 490 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 450 512 C 458 508 464 515 458 522 C 450 522 446 516 450 512 Z",
        "M 365 484 C 370 480 376 485 372 491 C 366 492 362 487 365 484 Z",
      ],
      shotPath: "M 505 555 Q 440 520 375 486",
    },
    // 홀별 상세 수직 야디지북 뷰 (480 x 680 캔버스)
    detail: {
      fairway: "M 200 600 C 190 500 170 380 200 260 C 215 200 230 160 240 110 C 270 110 280 160 270 240 C 260 360 285 480 270 600 Z",
      green: "M 240 105 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 242, y: 100 },
      tee: { x: 235, y: 615 },
      landing: { x: 230, y: 350 },
      landingCarry: "230m",
      remainGreen: "152m",
      bunkers: [
        { d: "M 270 340 C 290 330 305 345 295 365 C 280 375 265 360 270 340 Z", label: "페어웨이 벙커 210m" },
        { d: "M 205 110 C 220 100 225 115 218 128 C 205 132 198 120 205 110 Z", label: "그린사이드 벙커" }
      ],
      water: null,
      doglegText: "스트레이트 코스 · 페어웨이 중앙 공략",
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
    elevation: "평지 +1m",
    hazards: ["전면 웨스트 레이크 해저드", "그린 우측 샌드 트랩"],
    tip: "아름다운 호수를 가로지르는 시그니처 파 3 홀입니다. 바람의 영향을 고려해 한 클럽 여유 있게 선택하여 그린 중앙을 타겟으로 잡으세요.",
    recommendClub: "6번 아이언 155m 핀 직접 공략",
    landingWidth: "그린 폭 28m (원온 권장)",
    master: {
      tee: { x: 355, y: 475 },
      landing: { x: 310, y: 445 },
      green: { x: 265, y: 420 },
      pin: { x: 263, y: 417 },
      label: { x: 310, y: 430 },
      fairway: "M 355 470 C 330 450 305 435 270 415 C 260 425 285 445 320 465 C 345 480 355 485 360 478 Z",
      greenShape: "M 265 420 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 275 412 C 282 408 286 414 282 420 C 276 420 273 416 275 412 Z",
      ],
      shotPath: "M 355 475 Q 310 445 263 417",
    },
    detail: {
      fairway: "M 210 590 C 190 540 180 480 200 440 C 220 420 250 420 270 440 C 280 500 270 550 260 590 Z",
      green: "M 240 130 m -28 0 a 28 24 0 1 0 56 0 a 28 24 0 1 0 -56 0",
      pin: { x: 244, y: 125 },
      tee: { x: 235, y: 615 },
      landing: { x: 242, y: 135 },
      landingCarry: "164m",
      remainGreen: "PIN DIRECT",
      bunkers: [
        { d: "M 272 120 C 290 110 300 125 292 140 C 280 145 270 135 272 120 Z", label: "가드 벙커" }
      ],
      water: "M 80 410 C 140 370 240 360 380 390 C 390 470 320 520 180 500 C 110 480 70 440 80 410 Z",
      doglegText: "워터 해저드 캐리 130m 필수 · 그린 중앙 안전 공략",
    }
  },
  {
    number: 3,
    side: "out",
    par: 5,
    distance: 512,
    yards: 560,
    handicap: 3,
    name: "웨스턴 릿지 롱홀",
    elevation: "완만한 오르막 +6m",
    hazards: ["1차 랜딩존 우측 벙커", "2차 랜딩존 좌측 자연림", "그린사이드 팟 벙커"],
    tip: "서쪽 능선을 따라 북쪽으로 길게 뻗은 핸디캡 3번 롱홀입니다. 무리한 2온보다는 안전한 3온 레이업 전략이 확실한 파를 보장합니다.",
    recommendClub: "드라이버 230m → 3번 우드 200m → 웨지 80m",
    landingWidth: "페어웨이 폭 38m",
    master: {
      tee: { x: 245, y: 405 },
      landing: { x: 190, y: 330 },
      green: { x: 145, y: 185 },
      pin: { x: 144, y: 182 },
      label: { x: 175, y: 290 },
      fairway: "M 245 400 C 210 350 180 300 160 250 C 145 215 140 190 140 180 C 152 182 165 220 180 260 C 205 315 235 365 255 402 Z",
      greenShape: "M 145 185 m -11 0 a 11 10 0 1 0 22 0 a 11 10 0 1 0 -22 0",
      bunkers: [
        "M 205 320 C 212 315 218 322 212 328 C 205 328 202 322 205 320 Z",
      ],
      shotPath: "M 245 405 Q 185 325 144 182",
    },
    detail: {
      fairway: "M 190 600 C 170 480 150 360 170 260 C 180 200 200 150 215 95 C 245 95 260 150 250 250 C 240 370 270 480 260 600 Z",
      green: "M 215 90 m -24 0 a 24 20 0 1 0 48 0 a 24 20 0 1 0 -48 0",
      pin: { x: 218, y: 85 },
      tee: { x: 225, y: 615 },
      landing: { x: 205, y: 390 },
      landingCarry: "230m",
      remainGreen: "282m (3-ON 전략)",
      bunkers: [
        { d: "M 245 375 C 265 365 278 380 270 398 C 255 405 240 395 245 375 Z", label: "우측 페어웨이 벙커" },
        { d: "M 180 100 C 195 90 200 105 192 118 C 180 120 175 110 180 100 Z", label: "좌측 팟 벙커" }
      ],
      water: null,
      doglegText: "우측 능선 완만한 도그레그 · 3온 버디 트라이",
    }
  },
  {
    number: 4,
    side: "out",
    par: 4,
    distance: 395,
    yards: 432,
    handicap: 5,
    name: "포레스트 엘보우",
    elevation: "평지 -1m",
    hazards: ["도그레그 코너 대형 벙커", "좌측 OB 자연림 구역"],
    tip: "오른쪽으로 꺾어지는 전형적인 도그레그 홀입니다. 코너 소나무 숲 끝을 타겟으로 잡으면 숏아이언으로 그린 공략이 가능합니다.",
    recommendClub: "드라이버 230m → 7번 아이언 155m",
    landingWidth: "페어웨이 폭 36m",
    master: {
      tee: { x: 165, y: 160 },
      landing: { x: 240, y: 135 },
      green: { x: 320, y: 130 },
      pin: { x: 318, y: 128 },
      label: { x: 240, y: 118 },
      fairway: "M 160 165 C 195 145 235 130 275 125 C 295 122 315 125 325 135 C 315 145 285 142 250 148 C 210 155 180 175 165 175 Z",
      greenShape: "M 320 130 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 245 120 C 252 115 258 122 252 128 C 245 128 242 122 245 120 Z",
      ],
      shotPath: "M 165 160 Q 240 135 318 128",
    },
    detail: {
      fairway: "M 190 600 C 185 500 180 400 210 320 C 240 250 290 190 320 120 C 350 130 340 180 290 260 C 250 330 250 460 250 600 Z",
      green: "M 320 115 m -25 0 a 25 22 0 1 0 50 0 a 25 22 0 1 0 -50 0",
      pin: { x: 324, y: 110 },
      tee: { x: 220, y: 615 },
      landing: { x: 215, y: 340 },
      landingCarry: "230m",
      remainGreen: "165m (도그레그 세컨드)",
      bunkers: [
        { d: "M 235 305 C 255 295 268 310 260 328 C 245 335 230 325 235 305 Z", label: "코너 트랩 벙커" }
      ],
      water: null,
      doglegText: "우 도그레그 홀 · 코너 가드 소나무 좌측 겨냥",
    }
  },
  {
    number: 5,
    side: "out",
    par: 4,
    distance: 370,
    yards: 405,
    handicap: 11,
    name: "노스 파인 밸리",
    elevation: "완만한 내리막 -4m",
    hazards: ["페어웨이 좌측 크로스 벙커", "그린 우측 글래스 벙커"],
    tip: "북쪽 침엽수림 사이로 시원하게 뻗은 스트레이트 홀입니다. 티샷 랜딩 지점이 넓어 자신감 있는 드라이버 샷이 유리합니다.",
    recommendClub: "드라이버 235m → 9번 아이언 135m",
    landingWidth: "페어웨이 폭 44m (광활)",
    master: {
      tee: { x: 340, y: 135 },
      landing: { x: 420, y: 142 },
      green: { x: 495, y: 152 },
      pin: { x: 494, y: 150 },
      label: { x: 420, y: 125 },
      fairway: "M 340 130 C 380 135 430 142 470 148 C 490 152 495 160 490 165 C 470 162 430 155 385 148 C 350 142 340 138 340 130 Z",
      greenShape: "M 495 152 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 410 132 C 418 128 424 135 418 141 C 410 141 406 135 410 132 Z",
      ],
      shotPath: "M 340 135 Q 420 142 494 150",
    },
    detail: {
      fairway: "M 195 600 C 185 480 180 360 190 250 C 205 180 220 140 235 95 C 265 95 275 140 270 250 C 265 360 275 480 265 600 Z",
      green: "M 235 90 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 238, y: 85 },
      tee: { x: 230, y: 615 },
      landing: { x: 230, y: 350 },
      landingCarry: "235m",
      remainGreen: "135m",
      bunkers: [
        { d: "M 175 340 C 192 330 205 345 198 362 C 185 370 170 360 175 340 Z", label: "좌측 크로스 벙커" }
      ],
      water: null,
      doglegText: "직선형 와이드 페어웨이 · 내리막 순풍",
    }
  },
  {
    number: 6,
    side: "out",
    par: 3,
    distance: 178,
    yards: 195,
    handicap: 13,
    name: "마운틴 브룩 숏홀",
    elevation: "내리막 -7m",
    hazards: ["그린 전면 계곡 해저드", "그린 좌측 벙커"],
    tip: "티박스가 높은 곳에 위치한 내리막 파 3 홀입니다. 실거리보다 약 8m 적게 보고 바람을 체크한 후 정밀한 클럽을 선택하세요.",
    recommendClub: "6번 아이언 165m 타겟",
    landingWidth: "그린 폭 26m",
    master: {
      tee: { x: 510, y: 155 },
      landing: { x: 478, y: 185 },
      green: { x: 445, y: 215 },
      pin: { x: 443, y: 212 },
      label: { x: 485, y: 200 },
      fairway: "M 510 150 C 490 170 470 190 445 210 C 440 220 460 225 480 205 C 500 185 515 165 515 155 Z",
      greenShape: "M 445 215 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 438 206 C 445 202 450 208 445 214 C 438 214 435 208 438 206 Z",
      ],
      shotPath: "M 510 155 Q 478 185 443 212",
    },
    detail: {
      fairway: "M 205 590 C 190 530 185 470 200 420 C 220 400 250 400 270 420 C 280 470 270 540 260 590 Z",
      green: "M 235 140 m -28 0 a 28 23 0 1 0 56 0 a 28 23 0 1 0 -56 0",
      pin: { x: 238, y: 135 },
      tee: { x: 232, y: 615 },
      landing: { x: 235, y: 145 },
      landingCarry: "178m (내리막 170m 계산)",
      remainGreen: "PIN DIRECT",
      bunkers: [
        { d: "M 195 130 C 210 120 220 135 212 150 C 200 155 190 145 195 130 Z", label: "좌측 가드 벙커" }
      ],
      water: "M 100 370 C 180 340 280 350 370 380 C 350 420 270 430 190 410 C 130 400 95 385 100 370 Z",
      doglegText: "고저차 -7m 급경사 내리막 · 계곡 바람 주의",
    }
  },
  {
    number: 7,
    side: "out",
    par: 5,
    distance: 498,
    yards: 545,
    handicap: 1,
    name: "레이크 뷰 롱웨이",
    elevation: "완만한 내리막 -5m",
    hazards: ["우측 센트럴 레이크 유입 수계", "2차 랜딩존 페어웨이 벙커 2개"],
    tip: "코스에서 가장 난이도가 높은 핸디캡 1번 홀입니다. 우측 호수를 피해 페어웨이 좌측 능선 쪽으로 샷을 설계하는 것이 핵심입니다.",
    recommendClub: "드라이버 230m → 4번 아이언 190m → 샌드웨지 75m",
    landingWidth: "페어웨이 폭 35m (타이트)",
    master: {
      tee: { x: 430, y: 225 },
      landing: { x: 345, y: 270 },
      green: { x: 245, y: 360 },
      pin: { x: 243, y: 358 },
      label: { x: 330, y: 295 },
      fairway: "M 430 220 C 380 250 325 290 275 335 C 255 355 240 370 240 375 C 250 380 285 355 335 315 C 385 275 435 240 440 230 Z",
      greenShape: "M 245 360 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 340 275 C 348 270 354 278 348 284 C 340 284 336 278 340 275 Z",
      ],
      shotPath: "M 430 225 Q 345 270 243 358",
    },
    detail: {
      fairway: "M 200 600 C 185 490 160 380 180 280 C 195 210 225 150 240 100 C 270 100 280 150 265 250 C 250 360 280 480 270 600 Z",
      green: "M 240 95 m -25 0 a 25 21 0 1 0 50 0 a 25 21 0 1 0 -50 0",
      pin: { x: 242, y: 90 },
      tee: { x: 235, y: 615 },
      landing: { x: 215, y: 380 },
      landingCarry: "230m",
      remainGreen: "268m (우측 해저드 회피)",
      bunkers: [
        { d: "M 240 360 C 260 350 272 365 265 382 C 250 390 235 380 240 360 Z", label: "페어웨이 벙커" }
      ],
      water: "M 280 220 C 350 210 420 240 400 340 C 370 410 320 400 290 350 C 270 300 260 250 280 220 Z",
      doglegText: "핸디캡 1번 · 우측 호수 수계 절대 주의",
    }
  },
  {
    number: 8,
    side: "out",
    par: 4,
    distance: 408,
    yards: 446,
    handicap: 9,
    name: "센트럴 뱅크웨이",
    elevation: "평지 +0m",
    hazards: ["남측 센트럴 레이크 호수", "그린 앞 듀얼 항아리 벙커"],
    tip: "센트럴 호수 북쪽 기슭을 따라 동쪽으로 향하는 홀입니다. 페어웨이 우측은 워터 해저드가 도사리고 있으므로 중앙 살짝 좌측이 이상적입니다.",
    recommendClub: "드라이버 230m → 6번 아이언 165m",
    landingWidth: "페어웨이 폭 37m",
    master: {
      tee: { x: 260, y: 375 },
      landing: { x: 350, y: 382 },
      green: { x: 440, y: 382 },
      pin: { x: 438, y: 380 },
      label: { x: 350, y: 368 },
      fairway: "M 260 370 C 310 372 370 375 420 376 C 435 378 440 388 430 392 C 380 392 320 390 265 386 C 255 382 255 372 260 370 Z",
      greenShape: "M 440 382 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 425 374 C 432 370 436 376 430 382 C 424 382 420 376 425 374 Z",
      ],
      shotPath: "M 260 375 Q 350 382 438 380",
    },
    detail: {
      fairway: "M 195 600 C 185 480 180 360 190 260 C 205 190 220 140 235 95 C 265 95 275 140 270 250 C 260 360 275 480 265 600 Z",
      green: "M 235 95 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 238, y: 90 },
      tee: { x: 230, y: 615 },
      landing: { x: 230, y: 350 },
      landingCarry: "230m",
      remainGreen: "178m",
      bunkers: [
        { d: "M 205 110 C 220 100 226 115 218 128 C 205 130 198 120 205 110 Z", label: "항아리 벙커 A" },
        { d: "M 255 110 C 270 100 276 115 268 128 C 255 130 248 120 255 110 Z", label: "항아리 벙커 B" }
      ],
      water: "M 290 320 C 370 310 440 350 420 460 C 380 520 310 500 280 440 C 260 390 270 340 290 320 Z",
      doglegText: "호숫가 평지 코스 · 그린 앞 벙커 회피 넉넉한 클럽",
    }
  },
  {
    number: 9,
    side: "out",
    par: 4,
    distance: 385,
    yards: 421,
    handicap: 17,
    name: "클럽하우스 턴",
    elevation: "완만한 오르막 +4m",
    hazards: ["우측 센트럴 레이크 수면", "클럽하우스 앞 갤러리 벙커"],
    tip: "아웃코스를 마감하며 클럽하우스 정면으로 귀환하는 홀입니다. 아름다운 호수를 오른쪽에 끼고 정교한 세컨드 샷을 구사하세요.",
    recommendClub: "드라이버 225m → 8번 아이언 145m",
    landingWidth: "페어웨이 폭 42m",
    master: {
      tee: { x: 445, y: 365 },
      landing: { x: 485, y: 430 },
      green: { x: 520, y: 520 },
      pin: { x: 518, y: 518 },
      label: { x: 470, y: 445 },
      fairway: "M 445 365 C 465 410 490 460 515 510 C 525 512 525 525 515 528 C 495 515 470 460 450 405 C 440 375 440 365 445 365 Z",
      greenShape: "M 520 520 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 508 510 C 516 505 522 512 516 518 C 508 518 504 512 508 510 Z",
      ],
      shotPath: "M 445 365 Q 485 430 518 518",
    },
    detail: {
      fairway: "M 195 600 C 185 480 180 360 190 260 C 205 190 220 140 235 95 C 265 95 275 140 270 250 C 260 360 275 480 265 600 Z",
      green: "M 235 95 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 238, y: 90 },
      tee: { x: 230, y: 615 },
      landing: { x: 230, y: 360 },
      landingCarry: "225m",
      remainGreen: "160m (클럽하우스 뷰)",
      bunkers: [
        { d: "M 205 110 C 220 100 226 115 218 128 C 205 130 198 120 205 110 Z", label: "갤러리 벙커" }
      ],
      water: "M 280 340 C 350 330 420 370 400 480 C 360 540 300 520 270 460 C 255 410 260 360 280 340 Z",
      doglegText: "아웃코스 피날레 · 클럽하우스 정면 그린 안착",
    }
  },
  {
    number: 10,
    side: "in",
    par: 4,
    distance: 375,
    yards: 410,
    handicap: 8,
    name: "이스트 게이트웨이",
    elevation: "완만한 오르막 +3m",
    hazards: ["좌측 소나무 군락 OB", "그린 우측 벙커"],
    tip: "인코스의 시작을 알리는 홀입니다. 오른쪽으로 완만하게 흐르는 페어웨이 라인을 따라 페어웨이 중앙 약간 우측을 공략하세요.",
    recommendClub: "드라이버 230m → 8번 아이언 145m",
    landingWidth: "페어웨이 폭 42m",
    master: {
      tee: { x: 580, y: 555 },
      landing: { x: 650, y: 520 },
      green: { x: 720, y: 490 },
      pin: { x: 718, y: 486 },
      label: { x: 655, y: 505 },
      fairway: "M 580 560 C 615 545 655 530 690 515 C 715 500 730 495 735 488 C 725 480 700 495 665 515 C 630 535 590 550 580 560 Z",
      greenShape: "M 720 490 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 660 512 C 668 508 674 515 668 522 C 660 522 656 516 660 512 Z",
      ],
      shotPath: "M 580 555 Q 650 520 718 486",
    },
    detail: {
      fairway: "M 200 600 C 190 490 180 370 200 260 C 220 190 235 140 250 95 C 280 95 285 140 275 250 C 265 370 280 490 270 600 Z",
      green: "M 250 95 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 254, y: 90 },
      tee: { x: 235, y: 615 },
      landing: { x: 240, y: 350 },
      landingCarry: "230m",
      remainGreen: "145m",
      bunkers: [
        { d: "M 270 340 C 288 330 300 345 292 362 C 280 370 268 360 270 340 Z", label: "우측 가드 벙커" }
      ],
      water: null,
      doglegText: "인코스 스타트 · 완만한 우측 흐름",
    }
  },
  {
    number: 11,
    side: "in",
    par: 5,
    distance: 525,
    yards: 574,
    handicap: 2,
    name: "이스트 파인 리지",
    elevation: "완만한 오르막 +8m",
    hazards: ["1차 랜딩존 좌우 페어웨이 벙커", "그린 앞 런업 방해 둔덕"],
    tip: "오르막 경사가 길게 이어지는 최장거리 파 5 홀입니다. 무리한 장타보다 정확한 클럽 선택으로 페어웨이 중앙을 지키는 3온이 안전합니다.",
    recommendClub: "드라이버 230m → 3번 우드 210m → 9번 아이언 85m",
    landingWidth: "페어웨이 폭 36m",
    master: {
      tee: { x: 740, y: 480 },
      landing: { x: 820, y: 440 },
      green: { x: 925, y: 300 },
      pin: { x: 923, y: 298 },
      label: { x: 855, y: 395 },
      fairway: "M 740 480 C 785 455 835 425 870 380 C 900 340 920 310 930 295 C 935 305 915 340 885 385 C 850 435 800 470 745 490 Z",
      greenShape: "M 925 300 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 820 435 C 828 430 834 438 828 444 C 820 444 816 438 820 435 Z",
      ],
      shotPath: "M 740 480 Q 820 440 923 298",
    },
    detail: {
      fairway: "M 195 600 C 180 480 160 360 180 260 C 200 190 220 140 235 95 C 265 95 275 140 270 250 C 260 360 275 480 265 600 Z",
      green: "M 235 90 m -25 0 a 25 21 0 1 0 50 0 a 25 21 0 1 0 -50 0",
      pin: { x: 238, y: 85 },
      tee: { x: 230, y: 615 },
      landing: { x: 225, y: 380 },
      landingCarry: "230m",
      remainGreen: "295m (오르막 3온 전략)",
      bunkers: [
        { d: "M 175 365 C 195 355 208 370 200 388 C 185 395 170 385 175 365 Z", label: "좌측 벙커" },
        { d: "M 255 365 C 275 355 288 370 280 388 C 265 395 250 385 255 365 Z", label: "우측 벙커" }
      ],
      water: null,
      doglegText: "최장거리 핸디캡 2번 · 오르막 +8m 안정적 3온",
    }
  },
  {
    number: 12,
    side: "in",
    par: 4,
    distance: 388,
    yards: 424,
    handicap: 6,
    name: "도그레그 노스릿지",
    elevation: "평지 +1m",
    hazards: ["도그레그 코너 벙커 215m", "그린 뒤편 OB 구역"],
    tip: "왼쪽으로 꺾어지는 좌 도그레그 홀입니다. 코너 벙커 오른쪽으로 티샷을 안착시키면 세컨드 샷에서 그린 핀이 정면으로 보입니다.",
    recommendClub: "드라이버 225m → 7번 아이언 155m",
    landingWidth: "페어웨이 폭 38m",
    master: {
      tee: { x: 935, y: 280 },
      landing: { x: 915, y: 200 },
      green: { x: 865, y: 130 },
      pin: { x: 863, y: 128 },
      label: { x: 920, y: 185 },
      fairway: "M 935 280 C 925 235 915 195 895 165 C 875 140 860 130 855 130 C 865 140 885 165 905 205 C 925 245 940 275 945 282 Z",
      greenShape: "M 865 130 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 890 190 C 898 185 904 192 898 198 C 890 198 886 192 890 190 Z",
      ],
      shotPath: "M 935 280 Q 915 200 863 128",
    },
    detail: {
      fairway: "M 250 600 C 255 490 260 380 235 290 C 205 220 160 160 145 100 C 175 100 200 150 240 220 C 275 300 285 450 280 600 Z",
      green: "M 145 95 m -25 0 a 25 22 0 1 0 50 0 a 25 22 0 1 0 -50 0",
      pin: { x: 148, y: 90 },
      tee: { x: 260, y: 615 },
      landing: { x: 245, y: 330 },
      landingCarry: "225m",
      remainGreen: "163m (좌 도그레그 세컨드)",
      bunkers: [
        { d: "M 205 295 C 225 285 238 300 230 318 C 215 325 200 315 205 295 Z", label: "코너 벙커 215m" }
      ],
      water: null,
      doglegText: "좌 도그레그 코너 · 우측 페어웨이 안전 공략",
    }
  },
  {
    number: 13,
    side: "in",
    par: 3,
    distance: 155,
    yards: 170,
    handicap: 16,
    name: "크릭 사이드 숏홀",
    elevation: "내리막 -4m",
    hazards: ["그린 전면 실개천 해저드", "그린 우측 벙커"],
    tip: "티박스 앞을 가로지르는 자연 실개천과 벙커가 조화를 이루는 파 3 홀입니다. 앞핀일 경우 넉넉하게 그린 중앙에 떨어뜨려 퍼팅으로 승부하세요.",
    recommendClub: "7번 아이언 150m 타겟",
    landingWidth: "그린 폭 30m (안전)",
    master: {
      tee: { x: 855, y: 120 },
      landing: { x: 810, y: 110 },
      green: { x: 765, y: 105 },
      pin: { x: 763, y: 103 },
      label: { x: 810, y: 95 },
      fairway: "M 855 125 C 825 120 795 115 765 110 C 760 115 780 125 810 130 C 840 135 855 130 855 125 Z",
      greenShape: "M 765 105 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 775 112 C 782 108 786 114 782 120 C 776 120 773 116 775 112 Z",
      ],
      shotPath: "M 855 120 Q 810 110 763 103",
    },
    detail: {
      fairway: "M 210 590 C 195 530 190 470 205 420 C 225 400 255 400 275 420 C 285 470 275 540 265 590 Z",
      green: "M 240 140 m -28 0 a 28 24 0 1 0 56 0 a 28 24 0 1 0 -56 0",
      pin: { x: 244, y: 135 },
      tee: { x: 238, y: 615 },
      landing: { x: 240, y: 145 },
      landingCarry: "155m",
      remainGreen: "PIN DIRECT",
      bunkers: [
        { d: "M 272 130 C 290 120 300 135 292 150 C 280 155 270 145 272 130 Z", label: "우측 가드 벙커" }
      ],
      water: "M 90 350 C 170 330 270 340 370 360 C 350 400 270 410 180 390 C 120 380 85 365 90 350 Z",
      doglegText: "자연 실개천 캐리 · 핀 위치 무관 그린 센터 공략",
    }
  },
  {
    number: 14,
    side: "in",
    par: 4,
    distance: 412,
    yards: 450,
    handicap: 4,
    name: "아일랜드 어프로치",
    elevation: "완만한 내리막 -3m",
    hazards: ["그린 우측 이스트 레이크 반도", "세컨드 랜딩존 벙커"],
    tip: "그린이 이스트 레이크 쪽으로 돌출된 반도형 그린입니다. 티샷이 페어웨이 좌측으로 갈수록 워터 해저드를 피하는 각도가 편안해집니다.",
    recommendClub: "드라이버 230m → 6번 아이언 165m",
    landingWidth: "페어웨이 폭 38m",
    master: {
      tee: { x: 755, y: 110 },
      landing: { x: 695, y: 155 },
      green: { x: 635, y: 205 },
      pin: { x: 633, y: 202 },
      label: { x: 705, y: 185 },
      fairway: "M 755 110 C 725 140 690 175 645 210 C 630 215 640 225 665 205 C 700 175 735 140 765 120 Z",
      greenShape: "M 635 205 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 690 162 C 698 158 704 165 698 171 C 690 171 686 165 690 162 Z",
      ],
      shotPath: "M 755 110 Q 695 155 633 202",
    },
    detail: {
      fairway: "M 200 600 C 185 490 165 370 185 270 C 205 190 225 140 240 95 C 270 95 280 140 270 250 C 260 360 275 480 265 600 Z",
      green: "M 240 95 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 242, y: 90 },
      tee: { x: 235, y: 615 },
      landing: { x: 225, y: 360 },
      landingCarry: "230m",
      remainGreen: "182m (워터 해저드 조심)",
      bunkers: [
        { d: "M 180 345 C 198 335 210 350 202 368 C 190 375 175 365 180 345 Z", label: "페어웨이 벙커" }
      ],
      water: "M 270 70 C 330 60 400 90 380 170 C 350 220 300 210 275 160 C 260 120 265 85 270 70 Z",
      doglegText: "반도형 그린 · 그린 우측 워터 해저드 절대 주의",
    }
  },
  {
    number: 15,
    side: "in",
    par: 5,
    distance: 505,
    yards: 552,
    handicap: 10,
    name: "이스트 밸리 더블도그레그",
    elevation: "완만한 내리막 -6m",
    hazards: ["1차 랜딩존 우측 벙커", "2차 랜딩존 좌측 연못", "그린 앞 듀얼 트랩"],
    tip: "S자 형태로 휘어지는 전략적인 롱홀입니다. 장타자는 2온 유혹이 있지만, 그린 앞 벙커와 내리막 런을 감안해 3온이 가장 확실합니다.",
    recommendClub: "드라이버 230m → 3번 우드 200m → 어프로치 75m",
    landingWidth: "페어웨이 폭 37m",
    master: {
      tee: { x: 625, y: 215 },
      landing: { x: 695, y: 265 },
      green: { x: 825, y: 360 },
      pin: { x: 823, y: 358 },
      label: { x: 745, y: 300 },
      fairway: "M 625 210 C 675 240 735 285 780 325 C 810 350 825 365 830 365 C 825 375 795 365 760 335 C 715 295 655 250 625 220 Z",
      greenShape: "M 825 360 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 710 265 C 718 260 724 268 718 274 C 710 274 706 268 710 265 Z",
      ],
      shotPath: "M 625 215 Q 695 265 823 358",
    },
    detail: {
      fairway: "M 195 600 C 180 480 160 360 185 260 C 205 190 225 140 240 95 C 270 95 280 140 270 250 C 260 360 275 480 265 600 Z",
      green: "M 240 90 m -25 0 a 25 21 0 1 0 50 0 a 25 21 0 1 0 -50 0",
      pin: { x: 242, y: 85 },
      tee: { x: 232, y: 615 },
      landing: { x: 225, y: 375 },
      landingCarry: "230m",
      remainGreen: "275m (S자 리듬 레이업)",
      bunkers: [
        { d: "M 255 360 C 275 350 288 365 280 382 C 265 390 250 380 255 360 Z", label: "1차 랜딩 벙커" },
        { d: "M 210 105 C 225 95 230 110 222 122 C 210 125 205 115 210 105 Z", label: "그린 앞 벙커" }
      ],
      water: null,
      doglegText: "전략적 S자 롱홀 · 안전한 3온 버디 찬스",
    }
  },
  {
    number: 16,
    side: "in",
    par: 3,
    distance: 185,
    yards: 202,
    handicap: 12,
    name: "레이크 엣지 챌린지",
    elevation: "평지 +0m",
    hazards: ["이스트 레이크 워터 해저드", "그린 좌측 세컨드 벙커"],
    tip: "200야드에 육박하는 도전적인 롱 파 3 홀입니다. 우측 호수의 위압감을 피해 그린 좌측 에이프런을 노리는 것이 안전한 스코어 메이킹의 비결입니다.",
    recommendClub: "4번 아이언 또는 유틸리티 180m",
    landingWidth: "그린 폭 27m",
    master: {
      tee: { x: 815, y: 375 },
      landing: { x: 775, y: 400 },
      green: { x: 735, y: 425 },
      pin: { x: 733, y: 422 },
      label: { x: 775, y: 420 },
      fairway: "M 815 370 C 790 385 765 405 735 425 C 730 432 745 440 770 425 C 795 410 820 390 820 380 Z",
      greenShape: "M 735 425 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 745 416 C 752 412 756 418 752 424 C 746 424 743 420 745 416 Z",
      ],
      shotPath: "M 815 375 Q 775 400 733 422",
    },
    detail: {
      fairway: "M 205 590 C 190 530 185 470 200 420 C 220 400 250 400 270 420 C 280 470 270 540 260 590 Z",
      green: "M 235 140 m -28 0 a 28 23 0 1 0 56 0 a 28 23 0 1 0 -56 0",
      pin: { x: 238, y: 135 },
      tee: { x: 232, y: 615 },
      landing: { x: 235, y: 145 },
      landingCarry: "185m",
      remainGreen: "PIN DIRECT",
      bunkers: [
        { d: "M 195 130 C 210 120 220 135 212 150 C 200 155 190 145 195 130 Z", label: "좌측 가드 벙커" }
      ],
      water: "M 290 280 C 370 270 430 310 410 420 C 370 480 310 460 280 400 C 265 350 270 300 290 280 Z",
      doglegText: "롱 파3 챌린지 · 우측 호수 회피 좌측 에이프런 공략",
    }
  },
  {
    number: 17,
    side: "in",
    par: 4,
    distance: 391,
    yards: 428,
    handicap: 14,
    name: "워터 사이드 웨이",
    elevation: "평지 +0m",
    hazards: ["남측 센트럴 레이크 수면", "그린 앞 세컨드 벙커"],
    tip: "센트럴 호수 남동쪽 수면을 따라 서쪽으로 진행하는 미들홀입니다. 호수 쪽에서 불어오는 바람을 감안해 타겟을 페어웨이 중앙 약간 오른쪽으로 설정하세요.",
    recommendClub: "드라이버 225m → 7번 아이언 155m",
    landingWidth: "페어웨이 폭 39m",
    master: {
      tee: { x: 715, y: 435 },
      landing: { x: 645, y: 450 },
      green: { x: 575, y: 455 },
      pin: { x: 573, y: 453 },
      label: { x: 645, y: 435 },
      fairway: "M 715 430 C 675 440 635 445 595 450 C 575 452 575 462 585 465 C 625 462 670 455 715 442 Z",
      greenShape: "M 575 455 m -11 0 a 11 9 0 1 0 22 0 a 11 9 0 1 0 -22 0",
      bunkers: [
        "M 630 442 C 638 438 644 445 638 451 C 630 451 626 445 630 442 Z",
      ],
      shotPath: "M 715 435 Q 645 450 573 453",
    },
    detail: {
      fairway: "M 195 600 C 185 480 180 360 190 260 C 205 190 220 140 235 95 C 265 95 275 140 270 250 C 260 360 275 480 265 600 Z",
      green: "M 235 95 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 238, y: 90 },
      tee: { x: 230, y: 615 },
      landing: { x: 230, y: 350 },
      landingCarry: "225m",
      remainGreen: "166m",
      bunkers: [
        { d: "M 205 110 C 220 100 226 115 218 128 C 205 130 198 120 205 110 Z", label: "세컨드 가드 벙커" }
      ],
      water: "M 280 320 C 350 310 420 350 400 460 C 360 520 300 500 270 440 C 255 390 260 340 280 320 Z",
      doglegText: "호숫가 공략 · 슬라이스 바람 감안 우측 에이밍",
    }
  },
  {
    number: 18,
    side: "in",
    par: 4,
    distance: 362,
    yards: 396,
    handicap: 18,
    name: "클럽하우스 챔피언십 피날레",
    elevation: "완만한 오르막 +5m",
    hazards: ["센트럴 레이크 폰드", "그린 좌우 갤러리 벙커"],
    tip: "센트럴 호수를 지나 클럽하우스 정면 그린으로 복귀하는 드라마틱한 최종 피니시 홀입니다. 핀 앞쪽 둔덕을 감안해 넉넉한 세컨드 샷을 추천합니다.",
    recommendClub: "드라이버 225m → 8번 아이언 137m",
    landingWidth: "페어웨이 폭 45m (클럽하우스 뷰)",
    master: {
      tee: { x: 560, y: 440 },
      landing: { x: 555, y: 485 },
      green: { x: 550, y: 535 },
      pin: { x: 548, y: 532 },
      label: { x: 575, y: 485 },
      fairway: "M 560 440 C 560 470 560 500 555 530 C 545 532 545 520 548 495 C 550 470 552 445 560 440 Z",
      greenShape: "M 550 535 m -12 0 a 12 10 0 1 0 24 0 a 12 10 0 1 0 -24 0",
      bunkers: [
        "M 535 528 C 542 524 548 530 542 536 C 535 536 530 530 535 528 Z",
        "M 560 528 C 568 524 574 530 568 536 C 560 536 555 530 560 528 Z",
      ],
      shotPath: "M 560 440 Q 555 485 548 532",
    },
    detail: {
      fairway: "M 195 600 C 185 480 180 360 190 260 C 205 190 220 140 235 95 C 265 95 275 140 270 250 C 260 360 275 480 265 600 Z",
      green: "M 235 90 m -26 0 a 26 22 0 1 0 52 0 a 26 22 0 1 0 -52 0",
      pin: { x: 238, y: 85 },
      tee: { x: 230, y: 615 },
      landing: { x: 230, y: 360 },
      landingCarry: "225m",
      remainGreen: "137m (클럽하우스 갤러리 뷰)",
      bunkers: [
        { d: "M 190 105 C 208 95 215 110 208 125 C 195 128 185 118 190 105 Z", label: "그린 좌측 벙커" },
        { d: "M 265 105 C 282 95 290 110 282 125 C 270 128 260 118 265 105 Z", label: "그린 우측 벙커" }
      ],
      water: "M 120 460 C 170 420 220 430 200 510 C 170 540 130 520 120 460 Z",
      doglegText: "최종 18번 피날레 · 클럽하우스 갤러리 스탠드 앞 버디 퍼트",
    }
  }
];

// 수목 군락지 (자연 소나무 숲 클러스터 좌표)
const TREE_CLUSTERS = [
  // 서측 외곽림
  { cx: 120, cy: 220, r: 28 }, { cx: 135, cy: 250, r: 22 }, { cx: 110, cy: 280, r: 26 },
  { cx: 130, cy: 360, r: 30 }, { cx: 160, cy: 430, r: 24 }, { cx: 200, cy: 480, r: 26 },
  { cx: 220, cy: 520, r: 28 }, { cx: 180, cy: 560, r: 32 },
  // 북측 능선림
  { cx: 210, cy: 100, r: 26 }, { cx: 260, cy: 90, r: 32 }, { cx: 320, cy: 80, r: 28 },
  { cx: 380, cy: 85, r: 30 }, { cx: 440, cy: 90, r: 34 }, { cx: 500, cy: 95, r: 28 },
  { cx: 560, cy: 85, r: 32 }, { cx: 640, cy: 75, r: 36 }, { cx: 720, cy: 70, r: 30 },
  { cx: 800, cy: 75, r: 34 }, { cx: 880, cy: 80, r: 30 }, { cx: 940, cy: 100, r: 26 },
  // 동측 능선림
  { cx: 980, cy: 180, r: 32 }, { cx: 990, cy: 240, r: 30 }, { cx: 980, cy: 320, r: 34 },
  { cx: 960, cy: 400, r: 28 }, { cx: 920, cy: 480, r: 32 }, { cx: 860, cy: 540, r: 34 },
  { cx: 800, cy: 580, r: 30 },
  // 중앙 코스 간 격리 수목림
  { cx: 280, cy: 220, r: 24 }, { cx: 310, cy: 250, r: 22 }, { cx: 380, cy: 180, r: 26 },
  { cx: 470, cy: 270, r: 25 }, { cx: 520, cy: 240, r: 22 }, { cx: 570, cy: 180, r: 26 },
  { cx: 620, cy: 130, r: 24 }, { cx: 720, cy: 220, r: 25 }, { cx: 780, cy: 240, r: 26 },
  { cx: 850, cy: 220, r: 24 }, { cx: 670, cy: 370, r: 26 }, { cx: 730, cy: 340, r: 24 },
  { cx: 360, cy: 460, r: 22 }, { cx: 410, cy: 470, r: 24 }, { cx: 460, cy: 560, r: 20 },
  { cx: 610, cy: 560, r: 20 },
];

export default function CourseMap({ courseName = "그린힐스 파크 컨트리클럽" }) {
  // viewMode: "master" (18홀 챔피언십 항공 코스 전경 - 기본 뷰) vs "detail" (홀별 정밀 야디지북 뷰)
  const [viewMode, setViewMode] = useState("master");
  const [courseSide, setCourseSide] = useState("all");
  const [selectedHoleNumber, setSelectedHoleNumber] = useState(1);
  const [hoveredHoleNumber, setHoveredHoleNumber] = useState(null);

  const selectedHole = useMemo(
    () => HOLES.find((h) => h.number === selectedHoleNumber) || HOLES[0],
    [selectedHoleNumber]
  );

  const activeHoleNumber = hoveredHoleNumber || selectedHoleNumber;

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

  const isMaster = viewMode === "master";

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6"
      aria-labelledby="course-map-heading"
    >
      {/* 럭셔리 골프 클럽 쉘 카드 */}
      <div className="overflow-hidden rounded-2xl border border-[#1b3a24] bg-[#0c1a11] text-emerald-50 shadow-2xl">
        {/* 상단 컨트롤 헤더 */}
        <header className="flex flex-col gap-4 border-b border-[#1b3a24] bg-[#0e2115] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-emerald-400">
                AERIAL GOLF YARDAGE GUIDE
              </span>
              <span className="font-mono text-xs text-emerald-300/70">· 18 HOLES / PAR 72 · CHAMPIONSHIP COURSE</span>
            </div>
            <h2
              id="course-map-heading"
              className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl"
            >
              2D 인터랙티브 코스맵 & 야디지북
            </h2>
            <p className="mt-0.5 text-xs text-emerald-200/80 sm:text-sm">
              {isMaster
                ? "골프장 전체 18홀의 유기적인 지형과 코스 동선을 한눈에 조망하고, 홀을 클릭하여 공략 루트를 확인하세요."
                : `${selectedHole.number}번 홀 (${selectedHole.name}) 정밀 야디지북입니다. 티샷 비거리와 그린 공략선을 확인하세요.`}
            </p>
          </div>

          {/* 우측 뷰 모드 스위처 & 코스 필터 */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 뷰 모드 토글 (18홀 마스터 vs 홀 상세 야디지북) */}
            <div
              className="flex items-center rounded-xl border border-[#1b3a24] bg-[#09150d] p-1 text-xs font-semibold"
              role="group"
              aria-label="코스맵 뷰 모드 선택"
            >
              <button
                type="button"
                onClick={() => setViewMode("master")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                  isMaster
                    ? "bg-emerald-600 font-bold text-white shadow-md shadow-emerald-950"
                    : "text-emerald-300/70 hover:text-white"
                }`}
                aria-pressed={isMaster}
              >
                <span>⛳ 18홀 코스 전체</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("detail")}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
                  !isMaster
                    ? "bg-emerald-600 font-bold text-white shadow-md shadow-emerald-950"
                    : "text-emerald-300/70 hover:text-white"
                }`}
                aria-pressed={!isMaster}
              >
                <span>📖 홀별 야디지북</span>
              </button>
            </div>

            {/* 코스 구간 필터 */}
            <div
              role="radiogroup"
              aria-label="코스 구간 필터"
              className="flex items-center rounded-xl border border-[#1b3a24] bg-[#09150d] p-1 text-xs font-semibold"
            >
              {[
                { id: "all", label: "전체 18H" },
                { id: "out", label: "OUT (1~9)" },
                { id: "in", label: "IN (10~18)" },
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
                        ? "bg-[#163821] text-emerald-200 shadow-sm"
                        : "text-emerald-300/60 hover:text-emerald-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* 18홀 퀵 탭 셀렉터 */}
        <div className="border-b border-[#1b3a24] bg-[#09140c] px-4 py-2.5">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-emerald-800">
            <div className="flex items-center gap-1.5">
              {HOLES.map((h) => {
                const isSelected = h.number === selectedHoleNumber;
                const isHovered = h.number === hoveredHoleNumber;
                const isDimmed =
                  (courseSide === "out" && h.side !== "out") ||
                  (courseSide === "in" && h.side !== "in");

                return (
                  <button
                    key={h.number}
                    type="button"
                    onClick={() => setSelectedHoleNumber(h.number)}
                    onMouseEnter={() => setHoveredHoleNumber(h.number)}
                    onMouseLeave={() => setHoveredHoleNumber(null)}
                    disabled={isDimmed}
                    aria-label={`${h.number}번 홀 (Par ${h.par}, ${h.distance}m)`}
                    className={`flex h-8 min-w-[36px] items-center justify-center rounded-lg px-2 text-xs font-bold transition-all ${
                      isDimmed
                        ? "opacity-30 cursor-not-allowed"
                        : isSelected
                        ? "bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 scale-105 shadow-md"
                        : isHovered
                        ? "bg-emerald-800 text-white"
                        : "bg-[#112417] text-emerald-200/80 hover:bg-[#193522]"
                    }`}
                  >
                    <span>{h.number}H</span>
                  </button>
                );
              })}
            </div>

            {/* 좌우 이동 화살표 */}
            <div className="hidden sm:flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={handlePrevHole}
                aria-label="이전 홀"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1b3a24] bg-[#112417] text-xs font-bold text-emerald-300 transition hover:bg-emerald-700 hover:text-white"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleNextHole}
                aria-label="다음 홀"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#1b3a24] bg-[#112417] text-xs font-bold text-emerald-300 transition hover:bg-emerald-700 hover:text-white"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        {/* 본문 레이아웃: 좌측 지도 (약 68%) + 우측 야디지북 카드 (약 32%) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_370px]">
          {/* ================================================================ */}
          {/* 좌측: 인터랙티브 벡터 그래픽 캔버스 */}
          {/* ================================================================ */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-[#0a150d] p-3 sm:p-5">
            {/* 골프장 메타 배지 */}
            <div className="pointer-events-none absolute left-6 top-6 z-10 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-emerald-500/40 bg-[#0d2214]/90 px-3 py-1 font-mono text-xs font-bold text-emerald-300 backdrop-blur-md shadow-lg">
                {courseName}
              </span>
              <span className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 font-mono text-xs font-semibold text-amber-300 backdrop-blur-md shadow-md">
                {isMaster
                  ? `18H CHAMPIONSHIP AERIAL GUIDE`
                  : `HOLE ${selectedHole.number} · PAR ${selectedHole.par} · ${selectedHole.distance}M (${selectedHole.yards}YD)`}
              </span>
            </div>

            {/* 스크롤 가능한 SVG 컨테이너 */}
            <div className="relative w-full overflow-x-auto pb-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500">
              <div className="min-w-[720px] select-none lg:min-w-0">
                {isMaster ? (
                  // ============================================================
                  // 18홀 코스 전체 항공 마스터플랜 (Master Course Aerial Map)
                  // ============================================================
                  <svg
                    viewBox="0 0 1100 700"
                    className="h-auto w-full"
                    role="img"
                    aria-label={`${courseName} 18홀 전체 항공 코스맵`}
                  >
                    <defs>
                      {/* 자연 잔디 텍스처 패턴 */}
                      <pattern id="turfPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                        <path d="M 0 30 Q 30 20 60 30 T 120 30" fill="none" stroke="#16381e" strokeWidth="1" opacity="0.35" />
                        <path d="M 0 60 Q 30 50 60 60 T 120 60" fill="none" stroke="#16381e" strokeWidth="1" opacity="0.35" />
                      </pattern>

                      {/* 페어웨이 벨벳 에메랄드 그라데이션 */}
                      <linearGradient id="lushFairway" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2e8b57" />
                        <stop offset="50%" stopColor="#3cb371" />
                        <stop offset="100%" stopColor="#2e8b57" />
                      </linearGradient>

                      {/* 선택된 홀 하이라이트 그라데이션 */}
                      <linearGradient id="activeFairway" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="50%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>

                      {/* 호수 에메랄드 딥블루 수계 그라데이션 */}
                      <linearGradient id="lakeWater" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e6b91" />
                        <stop offset="60%" stopColor="#124a68" />
                        <stop offset="100%" stopColor="#0d354b" />
                      </linearGradient>

                      {/* 모래 벙커 자연 음영 */}
                      <linearGradient id="bunkerSand" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f7e8be" />
                        <stop offset="100%" stopColor="#dfc384" />
                      </linearGradient>

                      {/* 나무 캐노피 입체 그라데이션 */}
                      <radialGradient id="treeGrad" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#2e7d32" />
                        <stop offset="60%" stopColor="#1b5e20" />
                        <stop offset="100%" stopColor="#0f3a13" />
                      </radialGradient>

                      {/* 홀 발광 필터 */}
                      <filter id="fairwayGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur" />
                        <feFlood floodColor="#34d399" floodOpacity="0.7" result="color" />
                        <feComposite in2="blur" operator="in" result="shadow" />
                        <feMerge>
                          <feMergeNode in="shadow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* 1. 골프장 대지 베이스 (러프 및 지형 굴곡) */}
                    <rect width="1100" height="700" rx="16" fill="#0f2415" />
                    <rect width="1100" height="700" rx="16" fill="url(#turfPattern)" />

                    {/* 외곽 대지 경계선 및 능선 등고선 */}
                    <g opacity="0.4">
                      <path d="M 40 180 Q 200 80 450 70 T 900 80 Q 1060 140 1060 400 T 850 640 Q 550 670 250 640 T 40 400 Z" fill="#132c1b" stroke="#1d472b" strokeWidth="2" />
                      <path d="M 120 220 Q 300 130 550 120 T 980 200 Q 1000 450 820 590 T 220 570 Z" fill="none" stroke="#1f4c2e" strokeWidth="1.5" />
                    </g>

                    {/* 2. 대형 워터 해저드 수계 (Lakes & Streams) */}
                    {/* 센트럴 레이크 */}
                    <g id="central-lake">
                      <path
                        d="M 480 340 C 560 310 650 330 670 380 C 690 430 660 490 600 500 C 530 510 470 470 450 420 C 440 370 460 350 480 340 Z"
                        fill="url(#lakeWater)"
                        stroke="#b8a77f"
                        strokeWidth="3"
                        strokeOpacity="0.6"
                      />
                      {/* 잔잔한 물결 라인 */}
                      <path d="M 490 380 Q 550 370 630 390" fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0.3" />
                      <path d="M 520 430 Q 580 420 640 440" fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0.3" />
                      <text x="560" y="425" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold" opacity="0.6">
                        CENTRAL LAKE
                      </text>
                    </g>

                    {/* 웨스트 레이크 (2H, 3H 주변) */}
                    <g id="west-lake">
                      <path
                        d="M 230 400 C 310 380 340 430 330 470 C 310 510 240 520 200 490 C 180 460 190 420 230 400 Z"
                        fill="url(#lakeWater)"
                        stroke="#b8a77f"
                        strokeWidth="2.5"
                        strokeOpacity="0.5"
                      />
                      <path d="M 230 450 Q 270 440 300 460" fill="none" stroke="#7dd3fc" strokeWidth="1" opacity="0.3" />
                      <text x="260" y="465" textAnchor="middle" fill="#bae6fd" fontSize="10" fontWeight="bold" opacity="0.5">
                        WEST LAKE
                      </text>
                    </g>

                    {/* 이스트 레이크 (14H, 16H 주변) */}
                    <g id="east-lake">
                      <path
                        d="M 800 320 C 870 290 920 330 910 390 C 890 440 820 450 780 420 C 760 380 770 340 800 320 Z"
                        fill="url(#lakeWater)"
                        stroke="#b8a77f"
                        strokeWidth="2.5"
                        strokeOpacity="0.5"
                      />
                      <text x="845" y="380" textAnchor="middle" fill="#bae6fd" fontSize="10" fontWeight="bold" opacity="0.5">
                        EAST LAKE
                      </text>
                    </g>

                    {/* 3. 카트 도로망 (Cart Paths) */}
                    <g opacity="0.35">
                      <path d="M 520 570 C 470 550 420 510 370 470 S 260 410 240 390 S 180 330 160 260 S 150 160 200 130 S 320 120 440 130 S 520 160 490 220 S 380 270 300 340 S 320 400 440 380 S 520 460 540 540" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeDasharray="5 3" />
                      <path d="M 580 570 C 640 550 710 510 760 470 S 840 430 890 360 S 940 260 910 180 S 840 110 740 120 S 640 160 670 240 S 780 290 840 360 S 780 440 680 450 S 580 480 560 540" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeDasharray="5 3" />
                    </g>

                    {/* 4. 18개 홀 페어웨이 및 그린 렌더링 */}
                    <g id="all-fairways">
                      {HOLES.map((h) => {
                        const isSelected = h.number === selectedHoleNumber;
                        const isHovered = h.number === hoveredHoleNumber;
                        const isActive = isSelected || isHovered;
                        const isDimmed =
                          (courseSide === "out" && h.side !== "out") ||
                          (courseSide === "in" && h.side !== "in");

                        return (
                          <g
                            key={h.number}
                            onClick={() => setSelectedHoleNumber(h.number)}
                            onMouseEnter={() => setHoveredHoleNumber(h.number)}
                            onMouseLeave={() => setHoveredHoleNumber(null)}
                            className="cursor-pointer transition-all duration-300"
                            opacity={isDimmed ? 0.25 : isActive ? 1 : 0.75}
                          >
                            {/* 페어웨이 외곽 세미러프 테두리 */}
                            <path
                              d={h.master.fairway}
                              fill="#1b4d29"
                              stroke="#164022"
                              strokeWidth="8"
                              strokeLinejoin="round"
                            />

                            {/* 페어웨이 본체 */}
                            <path
                              d={h.master.fairway}
                              fill={isActive ? "url(#activeFairway)" : "url(#lushFairway)"}
                              filter={isActive ? "url(#fairwayGlow)" : undefined}
                              stroke={isActive ? "#6ee7b7" : "#226b38"}
                              strokeWidth={isActive ? 2 : 1}
                              strokeLinejoin="round"
                            />

                            {/* 벙커들 */}
                            {h.master.bunkers.map((bd, bi) => (
                              <path
                                key={bi}
                                d={bd}
                                fill="url(#bunkerSand)"
                                stroke="#b59458"
                                strokeWidth="1"
                              />
                            ))}

                            {/* 퍼팅 그린 */}
                            <path
                              d={h.master.greenShape}
                              fill={isActive ? "#4ade80" : "#22c55e"}
                              stroke="#15803d"
                              strokeWidth="1.5"
                            />

                            {/* 티박스 패드 */}
                            <rect
                              x={h.master.tee.x - 4}
                              y={h.master.tee.y - 3}
                              width="8"
                              height="6"
                              rx="1.5"
                              fill="#065f46"
                              stroke="#34d399"
                              strokeWidth="1"
                            />

                            {/* 핀 깃발 (Pin Flag) */}
                            <g>
                              {/* 깃대 */}
                              <line
                                x1={h.master.pin.x}
                                y1={h.master.pin.y}
                                x2={h.master.pin.x}
                                y2={h.master.pin.y - 12}
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                              {/* 붉은 깃발 */}
                              <polygon
                                points={`${h.master.pin.x},${h.master.pin.y - 12} ${h.master.pin.x + 8},${h.master.pin.y - 9} ${h.master.pin.x},${h.master.pin.y - 6}`}
                                fill={isActive ? "#ef4444" : "#dc2626"}
                              />
                            </g>

                            {/* 선택된 홀: 우아한 티샷 궤적선 및 비거리 라벨 */}
                            {isActive && (
                              <g>
                                <path
                                  d={h.master.shotPath}
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  strokeDasharray="4 3"
                                />
                                {/* 골프공 착탄 마커 */}
                                <circle
                                  cx={h.master.landing.x}
                                  cy={h.master.landing.y}
                                  r="4"
                                  fill="#ffffff"
                                  stroke="#10b981"
                                  strokeWidth="2"
                                />
                              </g>
                            )}

                            {/* 홀 번호 뱃지 마커 */}
                            <g transform={`translate(${h.master.label.x}, ${h.master.label.y})`}>
                              <circle
                                r={isActive ? 11 : 9}
                                fill={isActive ? "#10b981" : "#064e3b"}
                                stroke={isActive ? "#ffffff" : "#34d399"}
                                strokeWidth={isActive ? 2 : 1}
                                className="transition-all"
                              />
                              <text
                                y="3.5"
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize={isActive ? 10 : 8.5}
                                fontWeight="bold"
                              >
                                {h.number}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>

                    {/* 5. 풍성한 수목림 군락 (자연 소나무 숲들) */}
                    <g id="trees" opacity="0.85">
                      {TREE_CLUSTERS.map((t, idx) => (
                        <g key={idx} transform={`translate(${t.cx}, ${t.cy})`}>
                          {/* 나무 그림자 */}
                          <circle cx="2" cy="3" r={t.r} fill="#06180a" opacity="0.4" />
                          {/* 메인 캐노피 */}
                          <circle cx="0" cy="0" r={t.r} fill="url(#treeGrad)" />
                          {/* 내부 디테일 나뭇잎 */}
                          <circle cx={-t.r * 0.25} cy={-t.r * 0.25} r={t.r * 0.65} fill="#388e3c" opacity="0.3" />
                          <circle cx={t.r * 0.2} cy={t.r * 0.15} r={t.r * 0.45} fill="#1b5e20" opacity="0.5" />
                        </g>
                      ))}
                    </g>

                    {/* 6. 클럽하우스 & 스타팅 광장 */}
                    <g id="clubhouse" transform="translate(550, 585)">
                      {/* 클럽하우스 메인 테라스 & 퍼팅 연습 그린 */}
                      <ellipse cx="-75" cy="0" rx="28" ry="16" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
                      <text x="-75" y="3" textAnchor="middle" fill="#064e3b" fontSize="7" fontWeight="bold">
                        PRACTICE GREEN
                      </text>

                      {/* 클럽하우스 건물 본체 */}
                      <rect x="-45" y="-18" width="90" height="34" rx="4" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
                      <rect x="-35" y="-12" width="70" height="22" rx="2" fill="#334155" />
                      <text x="0" y="2" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="bold" letterSpacing="1">
                        CLUBHOUSE
                      </text>

                      {/* 스타트 진입로 */}
                      <path d="M 0 16 L 0 35" stroke="#94a3b8" strokeWidth="4" strokeDasharray="3 2" />
                    </g>

                    {/* 7. 방위계 & 축척 바 (Compass & Scale Bar) */}
                    <g id="compass" transform="translate(1020, 80)">
                      <circle r="18" fill="#0b1e12" stroke="#d4af37" strokeWidth="1.5" opacity="0.8" />
                      <polygon points="0,-14 4,-2 0,0 -4,-2" fill="#d4af37" />
                      <polygon points="0,14 4,2 0,0 -4,2" fill="#64748b" />
                      <text y="-16" textAnchor="middle" fill="#d4af37" fontSize="8" fontWeight="bold">N</text>
                    </g>

                    <g id="scale-bar" transform="translate(60, 650)">
                      <rect width="120" height="18" rx="4" fill="#0b1e12" stroke="#1b3a24" strokeWidth="1" opacity="0.85" />
                      <line x1="15" y1="10" x2="105" y2="10" stroke="#d4af37" strokeWidth="2" />
                      <line x1="15" y1="6" x2="15" y2="14" stroke="#d4af37" strokeWidth="1.5" />
                      <line x1="60" y1="7" x2="60" y2="13" stroke="#d4af37" strokeWidth="1" />
                      <line x1="105" y1="6" x2="105" y2="14" stroke="#d4af37" strokeWidth="1.5" />
                      <text x="60" y="24" textAnchor="middle" fill="#d4af37" fontSize="8" fontWeight="mono">
                        SCALE 1:2500 (300M)
                      </text>
                    </g>
                  </svg>
                ) : (
                  // ============================================================
                  // 홀별 정밀 야디지북 뷰 (Hole Yardage Book Detail)
                  // ============================================================
                  <svg
                    viewBox="0 0 480 680"
                    className="mx-auto h-auto max-w-[480px]"
                    role="img"
                    aria-label={`${selectedHole.number}번 홀 정밀 야디지북`}
                  >
                    <defs>
                      <linearGradient id="detailTurf" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#15361e" />
                        <stop offset="50%" stopColor="#193d23" />
                        <stop offset="100%" stopColor="#13311b" />
                      </linearGradient>

                      <linearGradient id="detailFairway" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="30%" stopColor="#22c55e" />
                        <stop offset="70%" stopColor="#16a34a" />
                        <stop offset="100%" stopColor="#15803d" />
                      </linearGradient>

                      <pattern id="mowerStripes" width="40" height="20" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="40" y2="20" stroke="#1b5e20" strokeWidth="4" opacity="0.25" />
                      </pattern>

                      <radialGradient id="greenSurface" cx="45%" cy="40%" r="55%">
                        <stop offset="0%" stopColor="#86efac" />
                        <stop offset="70%" stopColor="#4ade80" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </radialGradient>
                    </defs>

                    {/* 야디지북 배경 잔디 베이스 */}
                    <rect width="480" height="680" rx="14" fill="url(#detailTurf)" />

                    {/* 양옆 울창한 소나무 숲 군락 */}
                    <g opacity="0.8">
                      {/* 좌측 숲 */}
                      <circle cx="60" cy="180" r="45" fill="#143d1f" />
                      <circle cx="80" cy="240" r="40" fill="#1b4d28" />
                      <circle cx="50" cy="320" r="50" fill="#143d1f" />
                      <circle cx="70" cy="420" r="45" fill="#1b4d28" />
                      <circle cx="50" cy="500" r="50" fill="#143d1f" />
                      <circle cx="80" cy="580" r="40" fill="#1b4d28" />

                      {/* 우측 숲 */}
                      <circle cx="420" cy="180" r="45" fill="#143d1f" />
                      <circle cx="400" cy="240" r="40" fill="#1b4d28" />
                      <circle cx="430" cy="320" r="50" fill="#143d1f" />
                      <circle cx="410" cy="420" r="45" fill="#1b4d28" />
                      <circle cx="430" cy="500" r="50" fill="#143d1f" />
                      <circle cx="400" cy="580" r="40" fill="#1b4d28" />
                    </g>

                    {/* 워터 해저드가 있는 홀인 경우 렌더링 */}
                    {selectedHole.detail.water && (
                      <path
                        d={selectedHole.detail.water}
                        fill="url(#lakeWater)"
                        stroke="#b8a77f"
                        strokeWidth="3"
                      />
                    )}

                    {/* 페어웨이 러프 마운딩 */}
                    <path
                      d={selectedHole.detail.fairway}
                      fill="#194d27"
                      stroke="#143f20"
                      strokeWidth="12"
                      strokeLinejoin="round"
                    />

                    {/* 페어웨이 메인 잔디 */}
                    <path
                      d={selectedHole.detail.fairway}
                      fill="url(#detailFairway)"
                      stroke="#4ade80"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d={selectedHole.detail.fairway}
                      fill="url(#mowerStripes)"
                    />

                    {/* 샌드 벙커들 */}
                    {selectedHole.detail.bunkers.map((b, bi) => (
                      <g key={bi}>
                        <path
                          d={b.d}
                          fill="url(#bunkerSand)"
                          stroke="#a88544"
                          strokeWidth="1.5"
                        />
                        {/* 벙커 라벨 */}
                        <rect x="290" y={220 + bi * 40} width="120" height="20" rx="4" fill="#0a1a0f" stroke="#eab308" strokeWidth="0.8" opacity="0.85" />
                        <text x="350" y={234 + bi * 40} textAnchor="middle" fill="#fef08a" fontSize="9" fontWeight="bold">
                          ⚠ {b.label}
                        </text>
                      </g>
                    ))}

                    {/* 퍼팅 그린 구역 */}
                    <path
                      d={selectedHole.detail.green}
                      fill="url(#greenSurface)"
                      stroke="#15803d"
                      strokeWidth="2.5"
                    />

                    {/* 핀 깃발 & 홀 컵 */}
                    <ellipse cx={selectedHole.detail.pin.x} cy={selectedHole.detail.pin.y + 2} rx="4" ry="2" fill="#052e16" />
                    <line
                      x1={selectedHole.detail.pin.x}
                      y1={selectedHole.detail.pin.y}
                      x2={selectedHole.detail.pin.x}
                      y2={selectedHole.detail.pin.y - 20}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <polygon
                      points={`${selectedHole.detail.pin.x},${selectedHole.detail.pin.y - 20} ${selectedHole.detail.pin.x + 14},${selectedHole.detail.pin.y - 15} ${selectedHole.detail.pin.x},${selectedHole.detail.pin.y - 10}`}
                      fill="#ef4444"
                    />

                    {/* 티박스 구역 */}
                    <g transform={`translate(${selectedHole.detail.tee.x}, ${selectedHole.detail.tee.y})`}>
                      <rect x="-35" y="-10" width="70" height="20" rx="4" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
                      {/* 티 마커들 (블랙/블루/화이트/레드) */}
                      <circle cx="-22" cy="0" r="3" fill="#0f172a" />
                      <circle cx="-8" cy="0" r="3" fill="#2563eb" />
                      <circle cx="8" cy="0" r="3" fill="#ffffff" />
                      <circle cx="22" cy="0" r="3" fill="#dc2626" />
                      <text y="4" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">TEE</text>
                    </g>

                    {/* 전통 야디지북 비거리 기준선 (100m, 150m, 200m to Green) */}
                    <g opacity="0.75">
                      {/* 100M 기준선 */}
                      <line x1="160" y1="210" x2="320" y2="210" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
                      <rect x="215" y="202" width="50" height="16" rx="4" fill="#0a1a0f" stroke="#ffffff" strokeWidth="0.8" />
                      <text x="240" y="214" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">100M</text>

                      {/* 150M 기준선 */}
                      <line x1="150" y1="300" x2="330" y2="300" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
                      <rect x="215" y="292" width="50" height="16" rx="4" fill="#0a1a0f" stroke="#ffffff" strokeWidth="0.8" />
                      <text x="240" y="304" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">150M</text>

                      {/* 200M 기준선 */}
                      <line x1="140" y1="390" x2="340" y2="390" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" />
                      <rect x="215" y="382" width="50" height="16" rx="4" fill="#0a1a0f" stroke="#ffffff" strokeWidth="0.8" />
                      <text x="240" y="394" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">200M</text>
                    </g>

                    {/* 티샷 랜딩존 타겟 & 캐리 텔레메트리 */}
                    <g>
                      {/* 샷 궤적 곡선 */}
                      <path
                        d={`M ${selectedHole.detail.tee.x} ${selectedHole.detail.tee.y - 10} Q ${selectedHole.detail.landing.x} ${(selectedHole.detail.tee.y + selectedHole.detail.landing.y) / 2} ${selectedHole.detail.landing.x} ${selectedHole.detail.landing.y}`}
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="2.5"
                        strokeDasharray="5 3"
                      />
                      {/* 세컨드 샷 궤적 */}
                      <path
                        d={`M ${selectedHole.detail.landing.x} ${selectedHole.detail.landing.y} Q ${selectedHole.detail.pin.x} ${(selectedHole.detail.landing.y + selectedHole.detail.pin.y) / 2} ${selectedHole.detail.pin.x} ${selectedHole.detail.pin.y}`}
                        fill="none"
                        stroke="#93c5fd"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />

                      {/* 랜딩 타겟 골프공 */}
                      <circle
                        cx={selectedHole.detail.landing.x}
                        cy={selectedHole.detail.landing.y}
                        r="6"
                        fill="#ffffff"
                        stroke="#10b981"
                        strokeWidth="2"
                        className="animate-pulse"
                      />

                      {/* 랜딩 정보 카드 */}
                      <g transform={`translate(${selectedHole.detail.landing.x - 70}, ${selectedHole.detail.landing.y - 32})`}>
                        <rect width="140" height="24" rx="6" fill="#09180e" stroke="#34d399" strokeWidth="1" opacity="0.95" />
                        <text x="70" y="16" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontWeight="bold">
                          티샷 CARRY {selectedHole.detail.landingCarry} (잔여 {selectedHole.detail.remainGreen})
                        </text>
                      </g>
                    </g>
                  </svg>
                )}
              </div>
            </div>

            {/* 하단 코스 범례 바 */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#1b3a24] pt-3 text-xs text-emerald-200/80">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500 border border-emerald-300" />
                  페어웨이
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#4ade80] border border-emerald-600" />
                  퍼팅 그린
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#1e6b91] border border-sky-300" />
                  워터 해저드
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#f7e8be] border border-amber-600" />
                  모래 벙커
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#1b5e20] border border-emerald-900" />
                  수목림
                </span>
              </div>
              <div className="text-[11px] text-emerald-300/60 font-mono">
                {isMaster ? "💡 지도의 홀 번호를 클릭하면 즉시 공략선이 연결됩니다." : "💡 상단 [⛳ 18홀 코스 전체]를 누르면 마스터 전경으로 복귀합니다."}
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 우측: 정통 골프 야디지북 정보 카드 */}
          {/* ================================================================ */}
          <aside
            className="flex flex-col justify-between border-t border-[#1b3a24] bg-[#0c1c11] p-5 lg:border-l lg:border-t-0"
            aria-label={`${selectedHole.number}번 홀 상세 정보`}
          >
            <div className="space-y-5">
              {/* 홀 넘버 & 타이틀 헤더 */}
              <div className="flex items-start justify-between border-b border-[#1b3a24] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      YARDAGE SPEC
                    </span>
                    <span className="rounded bg-emerald-950 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 uppercase">
                      {selectedHole.side} COURSE
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono">
                      {selectedHole.number}
                    </span>
                    <span className="text-base font-bold text-emerald-100">
                      {selectedHole.name}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="rounded-lg bg-emerald-500 px-3 py-1 font-mono text-sm font-black text-slate-950 shadow-md">
                    PAR {selectedHole.par}
                  </span>
                  <span className="mt-1 font-mono text-xs text-emerald-300/80">
                    HCP {selectedHole.handicap}
                  </span>
                </div>
              </div>

              {/* 전장 & 지형 스펙 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#1b3a24] bg-[#09150d] p-3">
                  <div className="text-[11px] font-semibold text-emerald-300/70">전장 거리</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white font-mono">{selectedHole.distance}m</span>
                    <span className="text-xs text-emerald-400/80 font-mono">({selectedHole.yards}yd)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1b3a24] bg-[#09150d] p-3">
                  <div className="text-[11px] font-semibold text-emerald-300/70">고저차 / 지형</div>
                  <div className="mt-1 text-sm font-bold text-emerald-200">
                    {selectedHole.elevation}
                  </div>
                </div>
              </div>

              {/* 클럽 추천 및 공략 브리핑 */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <span>🏌️ 권장 클럽 플랜</span>
                </div>
                <div className="font-mono text-sm font-bold text-white pl-1">
                  {selectedHole.recommendClub}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60 text-xs text-emerald-200/80">
                  <span>페어웨이 폭</span>
                  <span className="font-semibold text-emerald-100">{selectedHole.landingWidth}</span>
                </div>
              </div>

              {/* 주요 위험 요소 */}
              <div>
                <div className="text-xs font-bold text-amber-300/90 mb-2">주요 위험 요소</div>
                <div className="flex flex-wrap gap-2">
                  {selectedHole.hazards.map((hazard, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-950/30 px-2.5 py-1 text-xs font-medium text-amber-200"
                    >
                      <span>⚠</span>
                      <span>{hazard}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* 캐디 공략 팁 */}
              <div className="rounded-xl border border-[#1b3a24] bg-[#09150d] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <span>⛳ 프로 캐디 어드바이스</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-emerald-100/90">
                  {selectedHole.tip}
                </p>
              </div>
            </div>

            {/* 하단 뷰 전환 퀵 액션 */}
            <div className="mt-6 pt-4 border-t border-[#1b3a24]">
              <button
                type="button"
                onClick={() => setViewMode(isMaster ? "detail" : "master")}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 transition"
              >
                <span>{isMaster ? "📖 이 홀의 정밀 야디지북 보기" : "⛳ 18홀 전체 코스 전경 보기"}</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
