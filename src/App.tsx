import { useCallback, useRef, useState } from "react";
import { Controls, type LanguageOption } from "./components/Controls";
import { SubtitleView } from "./components/SubtitleView";
import { Visualizer } from "./components/Visualizer";
import { VolumeMeter } from "./components/VolumeMeter";
import { useMicrophone } from "./hooks/useMicrophone";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";

const LANGUAGES: LanguageOption[] = [
  { value: "ja-JP", label: "日本語" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "zh-CN", label: "中文（简体）" },
  { value: "zh-TW", label: "中文（繁體）" },
  { value: "ko-KR", label: "한국어" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "pt-BR", label: "Português (BR)" },
  { value: "it-IT", label: "Italiano" },
  { value: "hi-IN", label: "हिन्दी" },
];

export default function App() {
  const microphone = useMicrophone();
  const [lang, setLang] = useState("ja-JP");
  const recognition = useSpeechRecognition(lang);

  const [fontSize, setFontSize] = useState(40);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [showVisualizer, setShowVisualizer] = useState(true);

  const stageRef = useRef<HTMLDivElement | null>(null);

  const listening = recognition.status === "listening";

  const handleStart = useCallback(async () => {
    if (!recognition.supported) return;
    await microphone.start();
    recognition.start();
  }, [microphone, recognition]);

  const handleStop = useCallback(() => {
    recognition.stop();
    microphone.stop();
  }, [microphone, recognition]);

  const handleClear = useCallback(() => {
    recognition.clear();
  }, [recognition]);

  const handleToggleFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void stage.requestFullscreen();
    }
  }, []);

  const alertMessage = !recognition.supported
    ? "このブラウザは音声認識（Web Speech API）に対応していません。Google Chrome もしくは Microsoft Edge をお使いください。"
    : (recognition.error ?? microphone.error);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className={`status-dot${listening ? " is-live" : ""}`} aria-hidden="true" />
          <span className="brand-name">Live Subtitle</span>
          <span className="brand-sub">Web Audio API リアルタイム字幕</span>
        </div>
        <Controls
          supported={recognition.supported}
          listening={listening}
          micStatus={microphone.status}
          languages={LANGUAGES}
          lang={lang}
          onLangChange={setLang}
          onStart={handleStart}
          onStop={handleStop}
          onClear={handleClear}
          onToggleFullscreen={handleToggleFullscreen}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          autoScroll={autoScroll}
          onAutoScrollChange={setAutoScroll}
          showHistory={showHistory}
          onShowHistoryChange={setShowHistory}
          showVisualizer={showVisualizer}
          onShowVisualizerChange={setShowVisualizer}
        />
      </header>

      {alertMessage ? <div className="alert">{alertMessage}</div> : null}

      <main className="stage" ref={stageRef}>
        <SubtitleView
          captions={recognition.captions}
          interim={recognition.interim}
          fontSize={fontSize}
          autoScroll={autoScroll}
          showHistory={showHistory}
          listening={listening}
        />

        <div className="dock">
          {showVisualizer ? (
            <Visualizer analyser={microphone.analyser} active={microphone.status === "running"} />
          ) : null}
          <VolumeMeter volume={microphone.volume} active={microphone.status === "running"} />
        </div>
      </main>
    </div>
  );
}
