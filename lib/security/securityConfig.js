/** 이상 행위 탐지 규칙의 단일 설정 원본. */
export const ANOMALY_RULES = {
  ANO_RATE: {
    id: 'ANO_RATE',
    category: 'anomaly',
    severity: 'warn',
    windowMinutes: 1,
    threshold: 60,
    description: '동일 IP API 호출 반복',
  },
  ANO_SCALP: {
    id: 'ANO_SCALP',
    category: 'anomaly',
    severity: 'warn',
    windowMinutes: 5,
    threshold: 3,
    description: '동일 주체 예약 생성 반복',
  },
  ANO_LOGIN_BF: {
    id: 'ANO_LOGIN_BF',
    category: 'anomaly',
    severity: 'critical',
    windowMinutes: 15,
    lockMinutes: 15,
    threshold: 5,
    description: '로그인 비밀번호 실패 반복',
  },
  ANO_ADMIN_BF: {
    id: 'ANO_ADMIN_BF',
    category: 'authz',
    severity: 'critical',
    windowMinutes: 10,
    threshold: 3,
    description: '관리자 영역 비인가 접근 반복',
  },
  ANO_CODE_ENUM: {
    id: 'ANO_CODE_ENUM',
    category: 'anomaly',
    severity: 'critical',
    windowMinutes: 10,
    threshold: 5,
    description: '존재하지 않는 예약번호 조회 반복',
  },
  ANO_LOOKUP_BF: {
    id: 'ANO_LOOKUP_BF',
    category: 'anomaly',
    severity: 'critical',
    windowMinutes: 10,
    threshold: 10,
    description: '서로 다른 전화번호로 조회 반복',
  },
};

function rule(id, name, eventType, severity, criteria, response) {
  return Object.freeze({ id, name, eventType, severity, criteria, response });
}

/** 보안 화면과 대응 로직이 함께 쓰는 규칙 메타데이터의 단일 원본. */
export const SECURITY_RULE_METADATA = Object.freeze({
  PII_PHONE: rule('PII_PHONE', '전화번호 탐지', 'non_attack', 'info', '전화번호 형식이 입력 또는 출력에서 1건 이상 탐지됨', '원문을 마스킹하고 기록을 확인'),
  PII_EMAIL: rule('PII_EMAIL', '이메일 탐지', 'non_attack', 'info', '이메일 주소 형식이 입력 또는 출력에서 1건 이상 탐지됨', '원문을 마스킹하고 기록을 확인'),
  PII_NAME: rule('PII_NAME', '이름 탐지', 'non_attack', 'info', '이름 문맥과 일치하는 문자열이 입력 또는 출력에서 탐지됨', '원문을 마스킹하고 오탐 여부 확인'),
  INJ_IGNORE: rule('INJ_IGNORE', '지시 무시 유도', 'attack', 'critical', '기존 지시를 무시하라는 한국어 프롬프트가 탐지됨', 'LLM 호출 차단 및 사고 조사'),
  INJ_IGNORE_EN: rule('INJ_IGNORE_EN', '지시 무시 유도(영문)', 'attack', 'critical', '기존 지시를 무시하라는 영문 프롬프트가 탐지됨', 'LLM 호출 차단 및 사고 조사'),
  INJ_SYSPROMPT: rule('INJ_SYSPROMPT', '시스템 프롬프트 탈취', 'attack', 'critical', '시스템 프롬프트 공개를 요구하는 표현이 탐지됨', 'LLM 호출 차단 및 사고 조사'),
  INJ_ROLE: rule('INJ_ROLE', '역할 위장 시도', 'attack', 'warn', '모델의 역할을 변경하려는 표현이 탐지됨', '요청 차단 및 반복 여부 관찰'),
  INJ_TOOL: rule('INJ_TOOL', '도구 강제 호출', 'attack', 'critical', '허가되지 않은 도구 실행을 강제하는 표현이 탐지됨', '요청 차단 및 사고 조사'),
  INJ_SQL: rule('INJ_SQL', 'SQL 주입 표현', 'attack', 'warn', 'SQL 조작에 사용되는 전형적인 표현이 탐지됨', '요청 차단 및 반복 여부 관찰'),
  INJ_XSS: rule('INJ_XSS', '스크립트 삽입 표현', 'attack', 'warn', '스크립트 또는 이벤트 핸들러 삽입 표현이 탐지됨', '요청 차단 및 반복 여부 관찰'),
  ANO_RATE: rule('ANO_RATE', 'API 과다 호출', 'attack', 'warn', '동일 IP가 1분 동안 API를 60회 이상 호출함', '60초 동안 API 요청 제한'),
  ANO_SCALP: rule('ANO_SCALP', '예약 선점 반복', 'attack', 'warn', '동일 주체가 5분 동안 예약을 3회 이상 생성함', '추가 예약을 5분 동안 제한'),
  ANO_LOGIN_BF: rule('ANO_LOGIN_BF', '로그인 무차별 대입', 'attack', 'critical', '동일 이메일·IP 조합이 15분 동안 인증에 5회 실패함', '로그인을 15분 잠그고 관리자 해제 제공'),
  ANO_ADMIN_BF: rule('ANO_ADMIN_BF', '관리자 경로 반복 공격', 'attack', 'critical', '동일 IP가 10분 동안 관리자 영역에 3회 이상 비인가 접근함', '앱 블랙리스트 및 Cloudflare 차단'),
  ANO_CODE_ENUM: rule('ANO_CODE_ENUM', '예약번호 열거', 'attack', 'critical', '동일 IP가 10분 동안 없는 예약번호를 5회 이상 조회함', '요청 차단 및 원본 IP 조사'),
  ANO_LOOKUP_BF: rule('ANO_LOOKUP_BF', '예약 조회 무차별 대입', 'attack', 'critical', '동일 IP가 10분 동안 서로 다른 전화번호 10개 이상으로 조회함', '요청 차단 및 원본 IP 조사'),
  ANO_ADMIN_PROBE: rule('ANO_ADMIN_PROBE', '관리자 경로 탐색', 'attack', 'warn', '존재하지 않는 관리자 페이지 또는 API 경로에 접근함', '접근 거부 및 반복 횟수 관찰'),
  AUTHZ_ADMIN: rule('AUTHZ_ADMIN', '관리자 권한 위반', 'attack', 'critical', 'guest 또는 user가 관리자 전용 페이지나 API에 접근함', '접근 거부 및 IP 차단 검토'),
  LEAK_SECRET: rule('LEAK_SECRET', '비밀값 응답 유출', 'non_attack', 'critical', 'API 응답에서 키 또는 인증 토큰 패턴이 탐지됨', '응답 경로 차단 및 키 즉시 교체'),
});

export function getRuleMetadata(ruleId) {
  return SECURITY_RULE_METADATA[ruleId] ?? null;
}
