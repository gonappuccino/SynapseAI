"use client";

export default function QuizProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="h-[3px] w-full bg-gray-200">
        <div className="h-full bg-gray-900 transition-all duration-500" style={{ width: `${total > 0 ? (current / total) * 100 : 0}%` }} />
      </div>
      <p className="mt-2 text-right text-[11px] tabular-nums text-gray-400">{current} / {total}</p>
    </div>
  );
}
