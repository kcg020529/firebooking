"use client";

import { useRef, useState } from "react";

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content: "안녕하세요. 골프장 검색과 예약을 도와드릴게요.",
  },
];
const DEFAULT_QUICK_REPLIES = [
  "필드 골프장 찾아줘",
  "스크린 골프장 찾아줘",
  "예약 가능한 시간 볼게요",
];

function createSessionId() {
  const saved = sessionStorage.getItem("firebooking-chat-session");

  if (saved) {
    return saved;
  }

  const sessionId = crypto.randomUUID();
  sessionStorage.setItem("firebooking-chat-session", sessionId);
  return sessionId;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const sessionIdRef = useRef(null);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState(DEFAULT_QUICK_REPLIES);

  async function sendMessage(content) {
    const trimmedContent = content.trim();

    if (!trimmedContent || isSending) {
      return;
    }

    const sessionId = sessionIdRef.current ?? createSessionId();
    sessionIdRef.current = sessionId;

    const userMessage = { role: "user", content: trimmedContent };
    const displayedMessages = [...messages, userMessage].slice(-20);
    const requestMessages = displayedMessages.filter(({ role }) => role === "user");
    setMessages(displayedMessages);
    setInput("");
    setIsSending(true);
    setQuickReplies([]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, messages: requestMessages }),
      });
      const data = await response.json();
      const assistantMessage = {
        role: "assistant",
        content: data.ok
          ? data.reply
          : data.error || "응답을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
      setMessages((current) => [...current, assistantMessage].slice(-20));
      setQuickReplies(
        data.ok && Array.isArray(data.quickReplies)
          ? data.quickReplies.slice(0, 4)
          : DEFAULT_QUICK_REPLIES,
      );
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "챗봇에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.",
        },
      ]);
      setQuickReplies(DEFAULT_QUICK_REPLIES);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleToggle() {
    if (!isOpen && !sessionIdRef.current) {
      sessionIdRef.current = createSessionId();
    }

    setIsOpen((current) => !current);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {isOpen ? (
        <section
          aria-label="골프 예약 챗봇"
          className="flex h-[32rem] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-emerald-800 px-4 py-3 text-white">
            <div>
              <h2 className="font-semibold">예약 챗봇</h2>
              <p className="text-xs text-emerald-100">개인정보는 로그에서 마스킹됩니다</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg px-2 py-1 text-sm hover:bg-emerald-700"
              aria-label="챗봇 닫기"
            >
              닫기
            </button>
          </header>

          <div
            className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 p-4"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-emerald-700 text-white"
                    : "bg-white text-neutral-800 shadow-sm"
                }`}
              >
                {message.content}
              </p>
            ))}
            {isSending ? (
              <p className="text-sm text-neutral-500">응답을 확인하고 있어요…</p>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
            <label htmlFor="chat-message" className="sr-only">
              예약 문의
            </label>
            <input
              id="chat-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={1000}
              placeholder="예약 내용을 입력하세요"
              className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
            />
            <button
              type="submit"
              disabled={isSending || input.trim().length === 0}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              전송
            </button>
          </form>
          {quickReplies.length > 0 ? (
            <div className="flex flex-wrap gap-2 border-t px-3 py-3">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  disabled={isSending}
                  onClick={() => void sendMessage(reply)}
                  className="rounded-full border border-emerald-700 px-3 py-1.5 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={handleToggle}
        className="rounded-full bg-emerald-800 px-5 py-3 font-medium text-white shadow-lg hover:bg-emerald-700"
        aria-expanded={isOpen}
        aria-label={isOpen ? "챗봇 닫기" : "예약 챗봇 열기"}
      >
        {isOpen ? "닫기" : "예약 문의"}
      </button>
    </div>
  );
}
