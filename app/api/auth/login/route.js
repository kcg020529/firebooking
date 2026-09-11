import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabaseAuth';
import { getUserProfile } from '@/lib/auth';
import { withApiLog } from '@/lib/security/apiLog';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { getClientIp, hashIp } from '@/lib/security/hash';
import {
  createLoginLimitKey,
  finishLoginAttempt,
  isCredentialFailure,
  recordLoginLock,
  reserveLoginAttempt,
} from '@/lib/security/loginProtection';
import {
  createSessionTimeoutToken,
  getSessionTimeoutCookieOptions,
  SESSION_TIMEOUT_COOKIE,
} from '@/lib/security/sessionTimeout';

const INVALID_CREDENTIALS_MESSAGE = '이메일 또는 비밀번호가 올바르지 않습니다.';
const LOCKED_MESSAGE = '로그인 시도가 너무 많습니다. 15분 후 다시 시도해 주세요.';

function jsonError(error, status, headers) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

export const POST = withApiLog(async (request) => {
  // 이 라우트에서 입력 검증, 시도 제한, 인증, 쿠키 발급, 감사 기록을 모두 처리합니다.
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('요청 형식이 올바르지 않습니다.', 400);
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || email.length > 254 || !password || password.length > 1024) {
    return jsonError(INVALID_CREDENTIALS_MESSAGE, 400);
  }

  const ipHash = hashIp(getClientIp(request));
  // 제한 키는 정규화한 이메일과 해시된 IP의 HMAC이며, 원본 식별 정보는 사용하지 않습니다.
  const keyHash = createLoginLimitKey(email, ipHash);
  const auditTargetId = `login:${keyHash.slice(0, 16)}`;

  let reservation;
  try {
    reservation = await reserveLoginAttempt(keyHash);
  } catch (error) {
    console.error('[auth.login] 로그인 제한 확인 실패:', error);
    return jsonError('로그인 보안 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.', 503);
  }

  if (!reservation.allowed) {
    // 계정 존재 여부는 노출하지 않고, 재시도 가능한 시간 정보만 응답합니다.
    recordAudit(request, {
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      result: 'deny',
      targetType: 'login_identifier',
      targetId: auditTargetId,
    });

    const retryAfter = Math.max(1, Number(reservation.retryAfterSeconds) || 1);
    return jsonError(
      reservation.reason === 'locked' ? LOCKED_MESSAGE : '로그인 처리 중입니다. 잠시 후 다시 시도해 주세요.',
      429,
      { 'Retry-After': String(retryAfter) }
    );
  }

  const cookieStore = await cookies();
  const supabase = createAuthServerClient(cookieStore);
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError || !data.user) {
    // 잘못된 인증 정보만 실패 횟수를 늘리고, 인프라 오류는 예약을 취소합니다.
    const outcome = isCredentialFailure(signInError) ? 'failure' : 'cancelled';
    let result;
    try {
      result = await finishLoginAttempt(keyHash, outcome);
    } catch (error) {
      console.error('[auth.login] 로그인 제한 확정 실패:', error);
      return jsonError('로그인 보안 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.', 503);
    }

    recordAudit(request, {
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      result: 'deny',
      targetType: 'login_identifier',
      targetId: auditTargetId,
    });

    if (result.locked) {
      await recordLoginLock({ ipHash }).catch((error) => {
        console.error('[auth.login] 로그인 잠금 이벤트 기록 실패:', error);
      });
      return jsonError(LOCKED_MESSAGE, 429, {
        'Retry-After': String(result.retryAfterSeconds ?? 900),
      });
    }

    if (!isCredentialFailure(signInError)) {
      return jsonError('로그인 서비스가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.', 503);
    }

    return NextResponse.json(
      {
        ok: false,
        error: INVALID_CREDENTIALS_MESSAGE,
        remainingAttempts: result.remainingAttempts,
      },
      { status: 401 }
    );
  }

  try {
    // 로그인에 성공하면 해당 이메일/IP 조합의 이전 실패 횟수를 초기화합니다.
    await finishLoginAttempt(keyHash, 'success');
  } catch (error) {
    await supabase.auth.signOut({ scope: 'local' });
    console.error('[auth.login] 성공 시도 초기화 실패:', error);
    return jsonError('로그인 보안 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.', 503);
  }

  cookieStore.set(
    // 유휴 시간 제한 쿠키를 인증된 Supabase 사용자에게 연결합니다.
    SESSION_TIMEOUT_COOKIE,
    createSessionTimeoutToken(data.user.id),
    getSessionTimeoutCookieOptions()
  );

  recordAudit(request, {
    action: AUDIT_ACTIONS.AUTH_LOGIN,
    result: 'allow',
    actorId: data.user.id,
    resolveActorRole: async () => (await getUserProfile(data.user.id)).role,
    targetType: 'session',
  });

  return NextResponse.json({ ok: true });
});
