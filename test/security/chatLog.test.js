import test from "node:test";
import assert from "node:assert/strict";

import {
  recordChatLog,
  recordSecurityEvents,
} from "../../lib/security/chatLog.js";
import { decryptIncidentIp } from "../../lib/security/hash.js";

async function withSupabaseConfiguration(run) {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  try {
    await run();
  } finally {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;

    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
}

test("chat_logs 요청 본문에 원문 PII를 넣지 않는다", async () => {
  await withSupabaseConfiguration(async () => {
    let requestBody;
    const fetchImpl = async (url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true };
    };

    await recordChatLog(
      {
        sessionId: "session-1234",
        role: "user",
        content: "전화번호는 010-1234-5678입니다",
      },
      fetchImpl,
    );

    assert.equal(requestBody[0].content_masked.includes("010-1234-5678"), false);
    assert.equal(requestBody[0].content_masked.includes("010-****-5678"), true);
    assert.equal(requestBody[0].pii_hits, 1);
  });
});

test("security_events 증거를 저장 직전에 다시 마스킹한다", async () => {
  await withSupabaseConfiguration(async () => {
    let requestBody;
    const fetchImpl = async (url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true };
    };

    await recordSecurityEvents(
      {
        hits: [{ ruleId: "PII_PHONE", severity: "info", count: 1 }],
        category: "pii",
        evidence: "전화번호는 010-1234-5678입니다",
      },
      fetchImpl,
    );

    assert.equal(requestBody[0].evidence.includes("010-1234-5678"), false);
    assert.equal(requestBody[0].rule_id, "PII_PHONE");
  });
});

test("critical 챗봇 이벤트에 요청 IP를 암호화해 저장한다", async () => {
  await withSupabaseConfiguration(async () => {
    const previousEncryptionKey = process.env.SECURITY_IP_ENCRYPTION_KEY;
    process.env.SECURITY_IP_ENCRYPTION_KEY = Buffer.alloc(32, 23).toString("base64");
    let requestBody;
    const fetchImpl = async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return { ok: true };
    };

    try {
      await recordSecurityEvents(
        {
          hits: [{ ruleId: "INJ_SYSPROMPT", severity: "critical", count: 1 }],
          category: "injection",
          evidence: "system prompt 요청",
          ipHash: "chat-ip-hash",
          networkContext: {
            ip: "198.51.100.44",
            country: "US",
            method: "POST",
            path: "/api/chat",
            userAgent: "Chat Attack Agent/1.0",
          },
        },
        fetchImpl,
      );

      assert.equal(
        decryptIncidentIp(requestBody[0].ip_ciphertext),
        "198.51.100.44",
      );
      assert.ok(requestBody[0].ip_expires_at);
    } finally {
      if (previousEncryptionKey === undefined) delete process.env.SECURITY_IP_ENCRYPTION_KEY;
      else process.env.SECURITY_IP_ENCRYPTION_KEY = previousEncryptionKey;
    }
  });
});
