"use client";

import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * 사이트키는 원래 공개용 값이다. 시크릿키는 Supabase Dashboard 에만 넣고 코드·Vercel 에 두지 않는다.
 * 값이 없으면 위젯을 그리지 않는다 — Supabase 에서 CAPTCHA 를 켜기 전 배포가 로그인을 막지 않게.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

let scriptPromise;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = undefined;
      reject(new Error("Turnstile 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Cloudflare Turnstile 위젯.
 *
 * 토큰은 한 번만 쓸 수 있다. 제출이 실패하면 부모가 resetKey 를 올려 새 토큰을 받게 한다.
 */
export default function TurnstileWidget({ resetKey = 0, onToken }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined;

    let isCancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (isCancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => onTokenRef.current?.(token),
          "expired-callback": () => onTokenRef.current?.(""),
          "error-callback": () => onTokenRef.current?.(""),
        });
      })
      .catch(() => onTokenRef.current?.(""));

    return () => {
      isCancelled = true;
      if (widgetIdRef.current !== null) window.turnstile?.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey === 0 || widgetIdRef.current === null) return;
    window.turnstile?.reset(widgetIdRef.current);
    onTokenRef.current?.("");
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={containerRef} className="min-h-[65px]" />;
}
