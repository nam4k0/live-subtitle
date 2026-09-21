import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "../lib/speech";

export type RecognitionStatus = "idle" | "listening" | "error";

export interface Caption {
  id: string;
  text: string;
  at: number;
}

export interface SpeechRecognitionState {
  supported: boolean;
  status: RecognitionStatus;
  error: string | null;
  captions: Caption[];
  interim: string;
  start: () => void;
  stop: () => void;
  clear: () => void;
}

const IGNORABLE_ERRORS = new Set(["no-speech", "aborted"]);
const MAX_CAPTIONS = 400;
const RESTART_DELAY = 250;

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

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRunRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = langRef.current;

    recognition.onstart = () => {
      setStatus("listening");
      setError(null);
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
          }
        } else {
          pending += transcript;
        }
      }
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      if (IGNORABLE_ERRORS.has(event.error)) return;
      shouldRunRef.current = false;
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "音声認識の利用が許可されていません。ブラウザの権限設定を確認してください。"
          : event.error === "network"
            ? "音声認識サービスに接続できません（ネットワークを確認してください）。"
            : `音声認識エラー: ${event.error}`;
      setError(message);
      setStatus("error");
      setInterim("");
    };

    recognition.onend = () => {
      setInterim("");
      if (!shouldRunRef.current) {
        setStatus((prev) => (prev === "error" ? prev : "idle"));
        return;
      }
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
      }
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (!shouldRunRef.current) return;
        try {
          recognition.start();
        } catch {
          void 0;
        }
      }, RESTART_DELAY);
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRunRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
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
  }, []);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (recognition) recognition.lang = lang;
  }, [lang]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || shouldRunRef.current) return;
    shouldRunRef.current = true;
    setError(null);
    setStatus("listening");
    try {
      recognition.start();
    } catch {
      void 0;
    }
  }, []);

  const stop = useCallback(() => {
    shouldRunRef.current = false;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
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
  }, []);

  const clear = useCallback(() => {
    setCaptions([]);
    setInterim("");
  }, []);

  return { supported, status, error, captions, interim, start, stop, clear };
}
