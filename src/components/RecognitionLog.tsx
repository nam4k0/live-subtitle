import { useEffect, useRef } from "react";
import type {
  RecognitionLogEntry,
  RecognitionStatus,
} from "../hooks/useSpeechRecognition";

interface RecognitionLogProps {
  log: RecognitionLogEntry[];
  status: RecognitionStatus;
  supported: boolean;
  restarts: number;
  micLabel: string | null;
  onClose: () => void;
}

const TYPE_LABEL: Record<RecognitionLogEntry["type"], string> = {
  info: "情報",
  start: "開始",
  result: "認識",
  end: "終了",
  error: "エラー",
};

function formatTime(value: number): string {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${String(
    date.getMilliseconds(),
  ).padStart(3, "0")}`;
}

export function RecognitionLog({
  log,
  status,
  supported,
  restarts,
  micLabel,
  onClose,
}: RecognitionLogProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [log]);

  return (
    <section className="diagnostics" aria-label="音声認識の診断ログ">
      <header className="diagnostics-head">
        <strong>音声認識ログ</strong>
        <span className="diagnostics-meta">
          対応: {supported ? "あり" : "なし"} / 状態: {status} / 再起動: {restarts} 回
          {micLabel ? ` / 入力: ${micLabel}` : ""}
        </span>
        <button type="button" className="btn" onClick={onClose}>
          閉じる
        </button>
      </header>
      <ol className="diagnostics-list">
        {log.length === 0 ? (
          <li className="diagnostics-empty">まだイベントがありません</li>
        ) : null}
        {log.map((entry) => (
          <li key={entry.id}>
            <time>{formatTime(entry.time)}</time>
            <span className={`tag tag-${entry.type}`}>{TYPE_LABEL[entry.type]}</span>
            <span className="diagnostics-detail">{entry.detail}</span>
          </li>
        ))}
      </ol>
      <div ref={endRef} />
    </section>
  );
}
