import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';

/**
 * Temporary Preview-only QA endpoint for A8 verification.
 * It is disabled unless both flags and a matching token are configured.
 * Remove this route after capturing the A8 security_events evidence.
 */
export const GET = withApiLog(async (request) => {
  const enabled =
    process.env.VERCEL_ENV === 'preview' &&
    process.env.PII_QA_ENABLED === 'true';
  const token = request.headers.get('x-pii-qa-token');

  if (!enabled || !token || token !== process.env.PII_QA_TOKEN) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    source: 'A8 synthetic QA only',
    phone: '010-1234-5678',
    email: 'qa@example.com',
  });
});
