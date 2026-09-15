import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabaseAuth';
import { withApiLog } from '@/lib/security/apiLog';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { CAPTCHA_FAILED_MESSAGE, isCaptchaFailure, normalizeCaptchaToken } from '@/lib/security/captcha';
import { isValidSignupEmail, normalizeSignupEmail } from '@/lib/security/emailValidation';

const PASSWORD_MIN_LENGTH = 6;

export const POST = withApiLog(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const email = normalizeSignupEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim().slice(0, 20) : '';
  if (!isValidSignupEmail(email)) {
    return NextResponse.json({ ok: false, error: '올바른 이메일 주소를 입력해 주세요.' }, { status: 400 });
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > 1024) {
    return NextResponse.json({ ok: false, error: `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.` }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createAuthServerClient(cookieStore);
  const captchaToken = normalizeCaptchaToken(body?.captchaToken);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || null },
      captchaToken: captchaToken || undefined,
    },
  });

  if (error) {
    recordAudit(request, { action: AUDIT_ACTIONS.AUTH_SIGNUP, result: 'deny', targetType: 'account' });
    const message = isCaptchaFailure(error)
      ? CAPTCHA_FAILED_MESSAGE
      : error.message.includes('already registered')
        ? '이미 가입된 이메일입니다.'
        : '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.';
    return NextResponse.json({ ok: false, error: message }, { status: isCaptchaFailure(error) ? 400 : 409 });
  }

  recordAudit(request, {
    action: AUDIT_ACTIONS.AUTH_SIGNUP,
    result: 'allow',
    actorId: data.user?.id ?? null,
    targetType: 'account',
  });
  return NextResponse.json({ ok: true, hasSession: Boolean(data.session) });
});

