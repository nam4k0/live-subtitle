import type { MicrophoneStatus } from "../hooks/useMicrophone";

export interface LanguageOption {
  value: string;
  label: string;
}

interface ControlsProps {
  supported: boolean;
  running: boolean;
  micStatus: MicrophoneStatus;
  languages: LanguageOption[];
  lang: string;
  onLangChange: (lang: string) => void;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onToggleFullscreen: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  autoScroll: boolean;
  onAutoScrollChange: (value: boolean) => void;
  showHistory: boolean;
  onShowHistoryChange: (value: boolean) => void;
  showVisualizer: boolean;
  onShowVisualizerChange: (value: boolean) => void;
  showDebug: boolean;
  onShowDebugChange: (value: boolean) => void;
}

const MIC_LABEL: Record<MicrophoneStatus, string> = {
  idle: "マイク: 待機",
  starting: "マイク: 起動中",
  running: "マイク: 入力中",
  error: "マイク: エラー",
};

export function Controls({
  supported,
  running,
  micStatus,
  languages,
  lang,
  onLangChange,
  onStart,
  onStop,
  onClear,
  onToggleFullscreen,
  fontSize,
  onFontSizeChange,
  autoScroll,
  onAutoScrollChange,
  showHistory,
  onShowHistoryChange,
  showVisualizer,
  onShowVisualizerChange,
  showDebug,
  onShowDebugChange,
}: ControlsProps) {
  return (
    <div className="controls">
      <button
        type="button"
        className={`btn btn-primary${running ? " is-stop" : ""}`}
        onClick={running ? onStop : onStart}
        disabled={!supported}
      >
        {running ? "■ 停止" : "● 開始"}
      </button>

      <button type="button" className="btn" onClick={onClear}>
        クリア
      </button>

      <span className={`badge badge-${micStatus}`}>{MIC_LABEL[micStatus]}</span>

      <label className="field">
        <span className="field-label">言語</span>
        <select
          className="select"
          value={lang}
          onChange={(event) => onLangChange(event.target.value)}
          disabled={!supported}
        >
          {languages.map((language) => (
            <option key={language.value} value={language.value}>
              {language.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">文字サイズ {fontSize}px</span>
        <input
          className="range"
          type="range"
          min={20}
          max={96}
          step={2}
          value={fontSize}
          onChange={(event) => onFontSizeChange(Number(event.target.value))}
        />
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={autoScroll}
          onChange={(event) => onAutoScrollChange(event.target.checked)}
        />
        <span>自動スクロール</span>
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={showHistory}
          onChange={(event) => onShowHistoryChange(event.target.checked)}
        />
        <span>履歴を表示</span>
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={showVisualizer}
          onChange={(event) => onShowVisualizerChange(event.target.checked)}
        />
        <span>波形</span>
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={showDebug}
          onChange={(event) => onShowDebugChange(event.target.checked)}
        />
        <span>診断ログ</span>
      </label>

      <button type="button" className="btn" onClick={onToggleFullscreen}>
        全画面
      </button>
    </div>
  );
}
