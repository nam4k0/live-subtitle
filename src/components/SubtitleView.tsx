import { useEffect, useRef } from "react";
import type { Caption } from "../hooks/useSpeechRecognition";

interface SubtitleViewProps {
  captions: Caption[];
  interim: string;
  fontSize: number;
  autoScroll: boolean;
  showHistory: boolean;
  listening: boolean;
}

export function SubtitleView({
  captions,
  interim,
  fontSize,
  autoScroll,
  showHistory,
  listening,
}: SubtitleViewProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [captions, interim, autoScroll]);

  const visible = showHistory ? captions : captions.slice(-3);
  const isEmpty = visible.length === 0 && interim.length === 0;

  return (
    <section className="subtitles" aria-live="polite" aria-atomic="false">
      {isEmpty ? (
        <p className="subtitles-empty">
          {listening
            ? "音声を聞き取り中… 話しかけてください"
            : "「開始」を押すと、マイクの音声がリアルタイムで字幕になります"}
        </p>
      ) : null}

      {visible.map((caption) => (
        <p key={caption.id} className="line line-final" style={{ fontSize }}>
          {caption.text}
        </p>
      ))}

      {interim ? (
        <p className="line line-interim" style={{ fontSize }}>
          {interim}
          <span className="caret" />
        </p>
      ) : null}

      <div ref={endRef} />
    </section>
  );
}
