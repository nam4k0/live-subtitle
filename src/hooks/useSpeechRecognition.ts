import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "../lib/speech";

export type RecognitionStatus = "idle" | "starting" | "listening" | "error";

export interface Caption {
  id: string;
  text: string;
  at: number;
}

export type RecognitionLogType = "info" | "start" | "result" | "end" | "error";

export interface RecognitionLogEntry {
  id: string;
  time: number;
  type: RecognitionLogType;
  detail: string;
}

export interface SpeechRecognitionState {
  supported: boolean;
  status: RecognitionStatus;
  error: string | null;
  captions: Caption[];
  interim: string;
  log: RecognitionLogEntry[];
  restarts: number;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

const IGNORABLE_ERRORS = new Set(["no-speech", "aborted"]);
const MAX_CAPTIONS = 400;
const MAX_LOG = 80;
const RESTART_DELAY = 400;
const START_TIMEOUT = 6000;
const QUICK_END_MS = 600;
const MAX_QUICK_ENDS = 4;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSpeechRecognition(lang: string): SpeechRecognitionState {
  const [supported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [status, setStatus] = useState<RecognitionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [interim, setInterim] = useState("");
  const [log, setLog] = useState<RecognitionLogEntry[]>([]);
  const [restarts, setRestarts] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRunRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const startTimerRef = useRef<number | null>(null);
  const lastStartAtRef = useRef(0);
  const quickEndsRef = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang;

  const pushLog = useCallback((type: RecognitionLogType, detail: string) => {
    setLog((prev) =>
      [...prev, { id: createId(), time: Date.now(), type, detail }].slice(-MAX_LOG),
    );
  }, []);

  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current !== null) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = langRef.current;
    pushLog("info", `認識エンジンを初期化しました (lang=${langRef.current})`);

    recognition.onstart = () => {
      lastStartAtRef.current = performance.now();
      quickEndsRef.current = 0;
      clearStartTimer();
      setStatus("listening");
      setError(null);
      pushLog("start", "音声認識を開始しました");
    };

    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const text = transcript.trim();
          if (text) {
            setCaptions((prev) =>
              [...prev, { id: createId(), text, at: Date.now() }].slice(-MAX_CAPTIONS),
            );
            pushLog("result", text);
          }
        } else {
          pending += transcript;
        }
      }
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      if (IGNORABLE_ERRORS.has(event.error)) {
        pushLog("info", `無視できるエラー: ${event.error}`);
        return;
      }
      shouldRunRef.current = false;
      clearStartTimer();
      clearRestartTimer();
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "音声認識の利用が許可されていません。ブラウザの権限設定を確認してください。"
          : event.error === "network"
            ? "音声認識サービスに接続できません（ネットワークを確認してください）。"
            : event.error === "audio-capture"
              ? "マイクを取得できませんでした。"
              : `音声認識エラー: ${event.error}`;
      setError(message);
      setStatus("error");
      setInterim("");
      pushLog(
        "error",
        `code=${event.error}${event.message ? ` / ${event.message}` : ""}`,
      );
    };

    recognition.onend = () => {
      clearStartTimer();
      setInterim("");
      const elapsed =
        lastStartAtRef.current === 0
          ? -1
          : Math.round(performance.now() - lastStartAtRef.current);
      pushLog(
        "end",
        elapsed >= 0 ? `開始から ${elapsed}ms で終了` : "onstart 前に終了",
      );

      if (!shouldRunRef.current) {
        setStatus((prev) => (prev === "error" ? prev : "idle"));
        return;
      }

      const quickEnd = elapsed < 0 || elapsed < QUICK_END_MS;
      quickEndsRef.current = quickEnd ? quickEndsRef.current + 1 : 0;

      if (quickEndsRef.current >= MAX_QUICK_ENDS) {
        shouldRunRef.current = false;
        setStatus("error");
        setError(
          "音声認識がすぐに終了してしまいます。Chrome の音声認識サービスに接続できていない可能性があります（ネットワーク制限や Chromium 系ビルドで発生します）。",
        );
        pushLog("error", "連続して即終了したため停止しました");
        return;
      }

      clearRestartTimer();
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (!shouldRunRef.current) return;
        setRestarts((prev) => prev + 1);
        pushLog("info", "音声認識を再起動します");
        try {
          recognition.start();
        } catch (cause) {
          pushLog(
            "error",
            `再起動に失敗: ${cause instanceof Error ? cause.message : String(cause)}`,
          );
        }
      }, RESTART_DELAY);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRunRef.current = false;
      clearStartTimer();
      clearRestartTimer();
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        void 0;
      }
      recognitionRef.current = null;
    };
  }, [pushLog, clearStartTimer, clearRestartTimer]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (recognition) recognition.lang = lang;
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setStatus("error");
      setError("音声認識を初期化できませんでした。");
      pushLog("error", "認識インスタンスが存在しません");
      return;
    }
    if (shouldRunRef.current) return;

    shouldRunRef.current = true;
    lastStartAtRef.current = 0;
    quickEndsRef.current = 0;
    setError(null);
    setStatus("starting");
    pushLog("info", "音声認識を開始します");

    clearStartTimer();
    startTimerRef.current = window.setTimeout(() => {
      startTimerRef.current = null;
      if (!shouldRunRef.current) return;
      shouldRunRef.current = false;
      setStatus("error");
      setError(
        "音声認識が開始されませんでした（onstart が発火しません）。ブラウザまたはネットワークの制限が考えられます。",
      );
      pushLog("error", "onstart が発火しませんでした");
    }, START_TIMEOUT);

    try {
      recognition.start();
    } catch (cause) {
      shouldRunRef.current = false;
      clearStartTimer();
      const detail = cause instanceof Error ? cause.message : String(cause);
      setStatus("error");
      setError(`音声認識を開始できませんでした: ${detail}`);
      pushLog("error", `start() で例外: ${detail}`);
    }
  }, [pushLog, clearStartTimer]);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    clearStartTimer();
    clearRestartTimer();
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        void 0;
      }
    }
    setInterim("");
    setStatus("idle");
    pushLog("info", "停止しました");
  }, [pushLog, clearStartTimer, clearRestartTimer]);

  const clear = useCallback(() => {
    setCaptions([]);
    setInterim("");
  }, []);

  return {
    supported,
    status,
    error,
    captions,
    interim,
    log,
    restarts,
    start,
    stop,
    clear,
  };
}
