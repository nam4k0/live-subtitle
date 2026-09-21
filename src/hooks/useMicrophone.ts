import { useCallback, useEffect, useRef, useState } from "react";

export type MicrophoneStatus = "idle" | "starting" | "running" | "error";

export interface MicrophoneState {
  status: MicrophoneStatus;
  error: string | null;
  volume: number;
  analyser: AnalyserNode | null;
  start: () => Promise<void>;
  stop: () => void;
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const scoped = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return scoped.AudioContext ?? scoped.webkitAudioContext ?? null;
}

export function useMicrophone(): MicrophoneState {
  const [status, setStatus] = useState<MicrophoneStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const startingRef = useRef(false);

  const stop = useCallback(() => {
    startingRef.current = false;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== "closed") {
      void context.close();
    }
    setAnalyser(null);
    setVolume(0);
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current || streamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("このブラウザはマイク入力に対応していません。");
      setStatus("error");
      return;
    }
    const Ctor = getAudioContextCtor();
    if (!Ctor) {
      setError("Web Audio API に対応していないブラウザです。");
      setStatus("error");
      return;
    }

    startingRef.current = true;
    setStatus("starting");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!startingRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const context = new Ctor();
      if (context.state === "suspended") {
        await context.resume();
      }

      const source = context.createMediaStreamSource(stream);
      const node = context.createAnalyser();
      node.fftSize = 2048;
      node.smoothingTimeConstant = 0.8;
      source.connect(node);
      contextRef.current = context;

      const buffer = new Uint8Array(node.fftSize);
      let lastUpdate = 0;
      const tick = (time: number) => {
        node.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) {
          const value = (buffer[i] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / buffer.length);
        if (time - lastUpdate > 50) {
          lastUpdate = time;
          const level = Math.min(1, rms * 3.2);
          setVolume((prev) => prev * 0.5 + level * 0.5);
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);

      setAnalyser(node);
      setStatus("running");
    } catch (cause) {
      streamRef.current = null;
      const denied = cause instanceof DOMException && cause.name === "NotAllowedError";
      setError(
        denied
          ? "マイクの使用が許可されませんでした。ブラウザの権限設定を確認してください。"
          : "マイクの起動に失敗しました。",
      );
      setStatus("error");
    } finally {
      startingRef.current = false;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { status, error, volume, analyser, start, stop };
}
