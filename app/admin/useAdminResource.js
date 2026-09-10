"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 관리자 대시보드 공통 데이터 로더.
 *
 * 보안 대시보드와 감사 로그가 "필터로 조회 + 5초 자동 갱신"이라는 동일한
 * 동작을 공유하므로 한 곳에 모은다. 두 화면에 폴링 로직을 복붙하면 한쪽만
 * 고쳐져서 갱신 주기가 어긋나는 사고가 난다 (adminFormat 을 공유하는 것과 같은 이유).
 *
 * 설계 원칙
 *  - 초기 로드·필터 변경: 스켈레톤을 보여주는 foreground 로드(isLoading).
 *  - 5초 자동 갱신: 화면을 비우지 않는 background 로드(isRefreshing). 표가 깜빡이지 않는다.
 *  - 탭이 백그라운드면 폴링을 멈춘다 — 보이지도 않는 화면 때문에 조회가 쌓이면
 *    /api/admin/* 이 매번 audit_logs·api_logs 에 기록을 남겨 정작 봐야 할 로그를 밀어낸다.
 *    다시 보이는 순간 즉시 1회 갱신한다.
 *  - 요청 경쟁 방지: 마지막으로 보낸 요청의 결과만 반영한다(reqId). 필터를 빠르게 바꾸거나
 *    자동 갱신과 수동 갱신이 겹쳐도 지난 응답이 최신 화면을 덮지 않는다.
 *
 * @param {string} url            조회할 URL(쿼리스트링 포함). 이 값이 바뀌면 foreground 로드.
 * @param {object} handlers
 * @param {(data: object) => void} handlers.onData   성공 응답(data.ok === true) 처리
 * @param {() => void} [handlers.onReset]             foreground 실패 시 기존 데이터 비우기
 * @param {string} handlers.errorMessage             네트워크 실패 시 표시할 메시지
 */
export const AUTO_REFRESH_MS = 5000;

export function useAdminResource(url, { onData, onReset, errorMessage }) {
  // 콜백을 ref 로 들고 있어 load 의 정체성을 url 에만 묶는다.
  // (onData 를 deps 에 넣으면 매 렌더마다 폴링 타이머가 재생성된다.)
  const onDataRef = useRef(onData);
  const onResetRef = useRef(onReset);
  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);

  // ref 갱신은 렌더 중이 아니라 커밋 이후에 한다.
  useEffect(() => {
    onDataRef.current = onData;
    onResetRef.current = onReset;
  });

  // 언마운트 후 도착한 응답이 setState 를 호출하지 않도록 마운트 여부를 들고 있는다.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(
    async ({ background = false } = {}) => {
      const id = ++reqIdRef.current;
      if (background) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (id !== reqIdRef.current || !mountedRef.current) return; // 최신·마운트 상태만 반영

        if (!data.ok) {
          // background 실패는 조용히 넘긴다 — 5초마다 깜빡이는 오류 배너를 만들지 않고
          // 직전에 성공한 데이터를 그대로 둔다. 다음 성공 갱신이 알아서 덮는다.
          if (!background) {
            setError(data.error || errorMessage);
            onResetRef.current?.();
          }
          return;
        }

        setError(null);
        onDataRef.current?.(data);
        setLoadedAt(new Date());
      } catch {
        if (id !== reqIdRef.current || !mountedRef.current) return;
        if (!background) {
          setError(errorMessage);
          onResetRef.current?.();
        }
      } finally {
        if (id === reqIdRef.current && mountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [url, errorMessage]
  );

  // 초기 로드 + url(필터) 변경 시 foreground 로드.
  // 데이터 패칭 side effect 는 effect 안에서 선언한 async 함수로 감싸 실행한다.
  useEffect(() => {
    let cancelled = false;
    async function runInitialLoad() {
      if (!cancelled) await load({ background: false });
    }
    runInitialLoad();
    return () => {
      cancelled = true;
    };
  }, [load]);

  // 5초 자동 갱신. 탭이 보일 때만 돌고, 다시 보이면 즉시 한 번 갱신한다.
  useEffect(() => {
    if (!autoRefresh) return;

    const tick = () => {
      if (document.visibilityState === "visible") load({ background: true });
    };
    const interval = setInterval(tick, AUTO_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load({ background: true });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [autoRefresh, load]);

  const refresh = useCallback(() => load({ background: true }), [load]);

  return { isLoading, isRefreshing, error, loadedAt, autoRefresh, setAutoRefresh, refresh };
}
