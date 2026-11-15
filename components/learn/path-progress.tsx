import type { CurriculumPath } from "@/lib/learn/curriculum";
import { SketchProgress } from "@/components/sketch";

export function PathProgressBar({
  done,
  total,
  color,
  className,
}: {
  done: number;
  total: number;
  color: CurriculumPath["color"];
  className?: string;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <SketchProgress
          value={pct / 100}
          seed={`progress:${color}`}
          tone={pct === 100 ? "green" : undefined}
          label={`${done} of ${total} complete`}
          className="flex-1"
        />
        <span className="flex-none font-mono text-xs font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1 text-sm text-pencil">
        {done} of {total} complete
      </div>
    </div>
  );
}
