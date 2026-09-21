interface VolumeMeterProps {
  volume: number;
  active: boolean;
}

const SEGMENTS = 28;

export function VolumeMeter({ volume, active }: VolumeMeterProps) {
  const clamped = Math.min(1, Math.max(0, volume));
  const percent = Math.round(clamped * 100);
  const lit = Math.round(clamped * SEGMENTS);

  return (
    <div
      className={`volume-meter${active ? " is-active" : ""}`}
      role="meter"
      aria-label="マイク入力レベル"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={`volume-segment${index < lit ? " is-lit" : ""}`}
          data-hot={index > SEGMENTS - 6}
        />
      ))}
    </div>
  );
}
