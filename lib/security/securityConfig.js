/** 이상 행위 탐지 규칙의 단일 설정 원본. */
export const ANOMALY_RULES = {
  ANO_LOGIN_BF: {
    id: 'ANO_LOGIN_BF',
    category: 'anomaly',
    severity: 'critical',
    windowMinutes: 15,
    lockMinutes: 15,
    threshold: 5,
    description: '로그인 비밀번호 실패 반복',
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
