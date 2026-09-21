import { useEffect, useRef } from "react";

interface VisualizerProps {
  analyser: AnalyserNode | null;
  active: boolean;
}

export function Visualizer({ analyser, active }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let smoothLevels: number[] = [];
    const frequency = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const waveform = analyser ? new Uint8Array(analyser.fftSize) : null;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelWidth = Math.max(1, Math.floor(width * dpr));
      const pixelHeight = Math.max(1, Math.floor(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      if (analyser && frequency && waveform) {
        analyser.getByteFrequencyData(frequency);
        analyser.getByteTimeDomainData(waveform);

        const barCount = 72;
        const gap = 2;
        const barWidth = Math.max(1, (width - gap * (barCount - 1)) / barCount);
        if (smoothLevels.length !== barCount) {
          smoothLevels = new Array<number>(barCount).fill(0);
        }
        const step = Math.max(1, Math.floor(frequency.length / barCount));
        for (let i = 0; i < barCount; i += 1) {
          let sum = 0;
          for (let j = 0; j < step; j += 1) {
            sum += frequency[i * step + j] ?? 0;
          }
          const value = sum / step / 255;
          smoothLevels[i] = smoothLevels[i] * 0.7 + value * 0.3;
          const barHeight = Math.max(2, smoothLevels[i] * height);
          const x = i * (barWidth + gap);
          const gradient = context.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, "rgba(56, 189, 248, 0.3)");
          gradient.addColorStop(1, "rgba(129, 140, 248, 0.95)");
          context.fillStyle = gradient;
          context.beginPath();
          context.roundRect(x, height - barHeight, barWidth, barHeight, Math.min(barWidth / 2, 3));
          context.fill();
        }

        context.strokeStyle = "rgba(226, 232, 240, 0.85)";
        context.lineWidth = 1.5;
        context.beginPath();
        for (let i = 0; i < waveform.length; i += 1) {
          const x = (i / (waveform.length - 1)) * width;
          const y = height / 2 + ((waveform[i] - 128) / 128) * (height / 2) * 0.8;
          if (i === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      } else {
        context.strokeStyle = active ? "rgba(148, 163, 184, 0.5)" : "rgba(148, 163, 184, 0.25)";
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(0, height / 2);
        context.lineTo(width, height / 2);
        context.stroke();
      }

      frame = requestAnimationFrame(render);
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [analyser, active]);

  return <canvas ref={canvasRef} className={`visualizer${active ? " is-active" : ""}`} />;
}
